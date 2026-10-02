"""Task 2: close public registration + provisioned roles (DB-independent).

Runs without Postgres: ProvisioningService is exercised with a fake
async session, and register gating via FastAPI TestClient with
dependency overrides.
"""

import uuid
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


# ---------------------------------------------------------------- fake session
class _FakeScalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class _FakeResult:
    def __init__(self, single=None, items=()):
        self._single = single
        self._items = list(items)

    def scalar_one_or_none(self):
        return self._single

    def scalars(self):
        return _FakeScalars(self._items)


class FakeSession:
    """Minimal AsyncSession stand-in.

    role_rows: list of objects with .user_id/.role_code/.bank_id attributes
    existing_user: object returned for User-by-email lookups (else None).
    """

    def __init__(self, role_rows=(), existing_user=None):
        self.role_rows = list(role_rows)
        self.existing_user = existing_user
        self.added = []
        self.commits = 0

    async def execute(self, stmt):
        text = str(stmt)
        if "role_assignments" in text:
            return _FakeResult(items=list(self.role_rows))
        return _FakeResult(single=self.existing_user)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.commits += 1

    async def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = uuid.uuid4()


def _assignment_row(user_id, role_code, bank_id=None):
    from types import SimpleNamespace

    return SimpleNamespace(
        user_id=user_id,
        role_code=role_code,
        bank_id=bank_id,
        granted_by=None,
        effective_from=None,
        effective_until=None,
        created_at=datetime.now(timezone.utc),
    )


# ------------------------------------------------------------- schema contract
def test_public_register_accepts_no_role():
    """Pilot register must not accept a client-supplied role."""
    from app.schemas.auth import UserCreate

    assert "role" not in UserCreate.model_fields, "UserCreate must not accept role in pilot profile"
    u = UserCreate(email="a@b.in", password="secret123")
    assert u.email == "a@b.in"


def test_role_code_enum_covers_pilot_roles():
    from app.models.role import RoleCode

    expected = {
        "bank_admin",
        "compliance_maker",
        "compliance_approver",
        "department_owner",
        "evidence_approver",
        "risk_approver",
        "auditor",
        "executive_viewer",
    }
    assert {r.value for r in RoleCode} == expected


# ------------------------------------------------------- provisioning service
@pytest.mark.asyncio
async def test_ordinary_user_cannot_assign_compliance_approver():
    from app.models.role import RoleCode
    from app.services.provisioning import AuthorizationError, ProvisioningService

    actor_id = uuid.uuid4()
    target_id = uuid.uuid4()
    svc = ProvisioningService(FakeSession(role_rows=[]))
    with pytest.raises(AuthorizationError):
        await svc.assign_roles(
            target_id,
            [RoleCode.COMPLIANCE_APPROVER],
            actor_id=actor_id,
            bank_id="bank-1",
        )


@pytest.mark.asyncio
async def test_bank_admin_can_assign_compliance_approver():
    from app.models.role import RoleCode
    from app.services.provisioning import ProvisioningService

    actor_id = uuid.uuid4()
    target_id = uuid.uuid4()
    svc = ProvisioningService(
        FakeSession(role_rows=[_assignment_row(actor_id, "bank_admin", "bank-1")])
    )
    rows = await svc.assign_roles(
        target_id,
        [RoleCode.COMPLIANCE_APPROVER],
        actor_id=actor_id,
        bank_id="bank-1",
    )
    assert len(rows) == 1
    assert rows[0].role_code == "compliance_approver"


@pytest.mark.asyncio
async def test_invite_requires_bank_admin():
    from app.services.provisioning import AuthorizationError, ProvisioningService

    svc = ProvisioningService(FakeSession(role_rows=[]))
    with pytest.raises(AuthorizationError):
        await svc.invite(
            "new@bank.in",
            bank_id="bank-1",
            roles=["auditor"],
            actor_id=uuid.uuid4(),
        )


@pytest.mark.asyncio
async def test_invite_by_admin_provisions_user_and_roles():
    from app.services.provisioning import ProvisioningService

    actor_id = uuid.uuid4()
    svc = ProvisioningService(
        FakeSession(role_rows=[_assignment_row(actor_id, "bank_admin", "bank-1")])
    )
    user, rows = await svc.invite(
        "new@bank.in", bank_id="bank-1", roles=["auditor"], actor_id=actor_id
    )
    assert user.email == "new@bank.in"
    assert [r.role_code for r in rows] == ["auditor"]
    assert all(r.bank_id == "bank-1" for r in rows)


@pytest.mark.asyncio
async def test_resolve_oidc_claims_stub():
    from app.services.provisioning import ProvisioningService

    svc = ProvisioningService(FakeSession())
    user = await svc.resolve_oidc_claims({"email": "oidc@bank.in", "sub": "x"})
    assert user is None  # stub: no auto-provisioning until OIDC wired


# ------------------------------------------------------------- router gating
def _client_with_env(monkeypatch, environment):
    from app import dependencies
    from app.config import settings
    from app.routers.auth import router

    monkeypatch.setattr(settings, "environment", environment)
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[dependencies.get_session] = lambda: FakeSession()
    return TestClient(app, raise_server_exceptions=False)


def test_register_gated_in_pilot_returns_404(monkeypatch):
    client = _client_with_env(monkeypatch, "pilot")
    resp = client.post("/auth/register", json={"email": "x@bank.in", "password": "secret123"})
    assert resp.status_code == 404, resp.text


def test_register_open_in_test_env(monkeypatch):
    client = _client_with_env(monkeypatch, "test")
    resp = client.post("/auth/register", json={"email": "x@bank.in", "password": "secret123"})
    assert resp.status_code == 201, resp.text
