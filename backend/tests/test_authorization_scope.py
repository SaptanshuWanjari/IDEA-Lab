"""Task 3: legal-entity scoped authorization (DB-independent).

Pure authorize()/scoped_select() unit tests plus TestClient 404 checks with
dependency overrides — no Postgres required.
"""

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


def _scope(user_id=None, bank="bank-a", entities=("entity-a",), roles=()):
    from app.services.authorization import RequestScope

    return RequestScope(
        user_id=str(user_id or uuid.uuid4()),
        bank_id=bank,
        legal_entity_ids=list(entities),
        department_ids=[],
        role_codes=list(roles),
    )


def _resource(bank="bank-a", entity="entity-a", submitter=None):
    return SimpleNamespace(bank_id=bank, legal_entity_id=entity, submitted_by=submitter)


# ------------------------------------------------------------- authorize unit
def test_other_entity_resource_is_denied():
    from app.services.authorization import AuthorizationError, Capability, authorize

    scope = _scope()
    with pytest.raises(AuthorizationError):
        authorize(scope, Capability.VIEW_REGULATION, _resource(entity="entity-b"))


def test_other_bank_resource_is_denied():
    from app.services.authorization import AuthorizationError, Capability, authorize

    scope = _scope()
    with pytest.raises(AuthorizationError):
        authorize(scope, Capability.VIEW_REGULATION, _resource(bank="bank-b", entity="entity-a"))


def test_same_scope_resource_is_allowed():
    from app.services.authorization import Capability, authorize

    authorize(_scope(), Capability.VIEW_REGULATION, _resource())  # must not raise


def test_submitter_cannot_approve_own_evidence():
    from app.services.authorization import AuthorizationError, Capability, authorize

    user_id = uuid.uuid4()
    scope = _scope(user_id=user_id)
    evidence = _resource(submitter=str(user_id))
    with pytest.raises(AuthorizationError, match="maker-checker"):
        authorize(scope, Capability.APPROVE_EVIDENCE, evidence)


def test_different_approver_can_approve_evidence():
    from app.services.authorization import Capability, authorize

    scope = _scope()
    evidence = _resource(submitter=str(uuid.uuid4()))
    authorize(scope, Capability.APPROVE_EVIDENCE, evidence)  # must not raise


def test_authorization_error_reused_from_provisioning():
    from app.services.authorization import AuthorizationError
    from app.services.provisioning import AuthorizationError as ProvisioningError

    assert AuthorizationError is ProvisioningError


# ---------------------------------------------------------- scoped_select unit
def test_scoped_select_filters_by_bank_and_entity():
    from app.models.regulation import Regulation
    from app.services.authorization import scoped_select

    stmt = scoped_select(Regulation, _scope())
    text = str(stmt)
    assert "bank_id" in text and "legal_entity_id" in text


def test_scoped_select_gracefully_handles_model_without_scope():
    from app.models.department import Department
    from app.services.authorization import scoped_select

    stmt = scoped_select(Department, _scope())
    assert "bank_id" not in str(stmt)


# ------------------------------------------------- router 404 confidentiality
def _regulations_client(monkeypatch, scope, regulation):
    from app import dependencies
    from app.routers.regulations import router

    app = FastAPI()
    app.include_router(router)

    async def _fake_session():
        s = MagicMock()
        s.get = AsyncMock(return_value=regulation)
        return s

    async def _fake_user():
        return SimpleNamespace(id=scope.user_id)

    async def _fake_scope():
        return scope

    app.dependency_overrides[dependencies.get_session] = _fake_session
    app.dependency_overrides[dependencies.get_current_user] = _fake_user
    app.dependency_overrides[dependencies.get_request_scope] = _fake_scope
    return TestClient(app, raise_server_exceptions=False)


def test_other_entity_regulation_is_hidden(monkeypatch):
    from app.models.regulation import Regulation

    reg = Regulation(
        id=uuid.uuid4(),
        title="Entity B reg",
        source_pdf_url="b/k",
        status="Review",
        bank_id="bank-a",
        legal_entity_id="entity-b",
        created_at=datetime.now(timezone.utc),
    )
    client = _regulations_client(monkeypatch, _scope(entities=("entity-a",)), reg)
    resp = client.get(f"/regulations/{reg.id}")
    assert resp.status_code == 404, resp.text


def test_same_entity_regulation_is_visible(monkeypatch):
    from app.models.regulation import Regulation

    reg = Regulation(
        id=uuid.uuid4(),
        title="Entity A reg",
        source_pdf_url="b/k",
        status="Review",
        bank_id="bank-a",
        legal_entity_id="entity-a",
        created_at=datetime.now(timezone.utc),
    )
    client = _regulations_client(monkeypatch, _scope(entities=("entity-a",)), reg)
    resp = client.get(f"/regulations/{reg.id}")
    assert resp.status_code == 200, resp.text


# --------------------------------------- service-level scope demonstration
@pytest.mark.asyncio
async def test_regulation_service_get_scoped_denies_cross_entity():
    from app.services.authorization import AuthorizationError
    from app.services.regulation_service import RegulationService

    reg_id = uuid.uuid4()
    reg = SimpleNamespace(id=reg_id, bank_id="bank-a", legal_entity_id="entity-b")
    session = MagicMock()
    session.get = AsyncMock(return_value=reg)
    svc = RegulationService(session, MagicMock())
    with pytest.raises(AuthorizationError):
        await svc.get_scoped(str(reg_id), _scope(entities=("entity-a",)))


@pytest.mark.asyncio
async def test_regulation_service_create_tags_new_rows_with_scope():
    from app.services.regulation_service import RegulationService

    class _FakeSession:
        def __init__(self):
            self.added = []

        async def execute(self, stmt):
            class _R:
                def scalar_one_or_none(self):
                    return None

            return _R()

        def add(self, obj):
            self.added.append(obj)

        async def commit(self):
            pass

        async def refresh(self, obj):
            pass

    class _FakeStorage:
        def upload(self, bucket, name, data, ctype):
            return f"{bucket}/{name}"

    scope = _scope(bank="bank-a", entities=("entity-a",))
    svc = RegulationService(_FakeSession(), _FakeStorage())
    reg = await svc.create(b"%PDF-1.4 pdf-bytes\n%%EOF", "r.pdf", "T", str(uuid.uuid4()), scope=scope)
    assert reg.bank_id == "bank-a"
    assert reg.legal_entity_id == "entity-a"
