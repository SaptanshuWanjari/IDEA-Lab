"""Task 8: formal MAP workflow — invalid transitions and self-approval are
rejected; every transition writes a before/after audit event. DB-free."""

from uuid import uuid4

import pytest

from app.models.map import MAP
from app.models.map_plan import MAPStatus
from app.services.authorization import RequestScope
from app.services.workflow import InvalidTransition, transition_map


def _scope(user_id="owner-1"):
    return RequestScope(
        user_id=user_id,
        bank_id="bank-1",
        legal_entity_ids=["entity-1"],
        department_ids=[],
        role_codes=["department_owner"],
    )


class _Scalars:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return _Scalars(self._rows)


class FakeSession:
    def __init__(self, maps=None, deps=None):
        self.maps = {str(m.id): m for m in (maps or [])}
        self.deps = list(deps or [])
        self.added = []
        self.committed = False

    async def get(self, model, oid):
        return self.maps.get(str(oid))

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        pass

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        pass

    async def execute(self, stmt):
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "map_dependencies" in compiled:
            return _Result(list(self.deps))
        return _Result([])


def _map(status="Pending", submitted_by="owner-1", **kw):
    base = dict(
        id=uuid4(),
        regulation_id=uuid4(),
        owner_department_id=uuid4(),
        description="File STR within 24 hours",
        status=status,
        approval_state="Draft",
        bank_id="bank-1",
        legal_entity_id="entity-1",
        submitted_by=submitted_by,
    )
    base.update(kw)
    return MAP(**base)


@pytest.mark.asyncio
async def test_invalid_pending_to_completed_transition_is_rejected():
    m = _map(status="Pending")
    session = FakeSession(maps=[m])
    with pytest.raises(InvalidTransition):
        await transition_map(
            session, str(m.id), MAPStatus.COMPLETED, _scope(), "skip evidence"
        )
    assert m.status == "Pending"


@pytest.mark.asyncio
async def test_self_approval_is_rejected():
    m = _map(status="Submitted", submitted_by="owner-1")
    session = FakeSession(maps=[m])
    with pytest.raises(Exception, match="maker-checker"):
        await transition_map(
            session, str(m.id), MAPStatus.COMPLETED, _scope(user_id="owner-1"), "approve it"
        )
    assert m.status == "Submitted"


@pytest.mark.asyncio
async def test_completion_requires_a_reason():
    m = _map(status="Submitted", submitted_by="owner-1")
    session = FakeSession(maps=[m])
    with pytest.raises(InvalidTransition, match="reason"):
        await transition_map(
            session, str(m.id), MAPStatus.COMPLETED, _scope(user_id="approver-9"), None
        )
    assert m.status == "Submitted"


@pytest.mark.asyncio
async def test_valid_lifecycle_reaches_completed_with_audit_trail():
    m = _map(status="Pending", submitted_by="owner-1")
    session = FakeSession(maps=[m])
    m = await transition_map(session, str(m.id), MAPStatus.IN_PROGRESS, _scope(), None)
    assert m.status == MAPStatus.IN_PROGRESS.value
    m = await transition_map(
        session, str(m.id), MAPStatus.SUBMITTED, _scope(), "work done"
    )
    assert m.status == MAPStatus.SUBMITTED.value
    m = await transition_map(
        session,
        str(m.id),
        MAPStatus.COMPLETED,
        _scope(user_id="approver-9"),
        "evidence accepted",
    )
    assert m.status == MAPStatus.COMPLETED.value
    audits = [a for a in session.added if a.__class__.__name__ == "AuditLog"]
    assert len(audits) == 3
    first = audits[0]
    assert first.before["status"] == "Pending"
    assert first.after["status"] == MAPStatus.IN_PROGRESS.value


@pytest.mark.asyncio
async def test_out_of_scope_transition_is_hidden():
    m = _map(status="Pending", bank_id="other-bank", legal_entity_id="other-entity")
    session = FakeSession(maps=[m])
    with pytest.raises(Exception):
        await transition_map(
            session, str(m.id), MAPStatus.IN_PROGRESS, _scope(), None
        )
    assert m.status == "Pending"
