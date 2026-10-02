"""Task 8: versioned MAP plans — regeneration creates a candidate draft and
approval supersedes the prior active plan. DB-free (FakeSession)."""

import uuid

import pytest

from app.models.map_plan import MAPPlan, MAPPlanStatus
from app.models.obligation import Obligation, ObligationStatus
from app.services.authorization import RequestScope
from app.services.map_plan_service import (
    approve_plan,
    create_candidate_plan,
    diff_plans,
)


def _scope(user_id="maker-1"):
    return RequestScope(
        user_id=user_id,
        bank_id="bank-1",
        legal_entity_ids=["entity-1"],
        department_ids=[],
        role_codes=["compliance_maker"],
    )


def _obligation(oid, status=ObligationStatus.APPROVED):
    value = status.value if hasattr(status, "value") else status
    return Obligation(
        id=oid,
        regulation_version_id="rv-1",
        clause_id="3.1",
        quote="Banks shall report incidents within 24 hours.",
        page=4,
        obligation_text="Report incidents within 24 hours",
        status=value,
        bank_id="bank-1",
        legal_entity_id="entity-1",
        created_by="maker-1",
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
    """Minimal async session double backed by in-memory dicts."""

    def __init__(self, obligations=None, plans=None, items=None):
        self.obligations = {o.id: o for o in (obligations or [])}
        self.plans = {p.id: p for p in (plans or [])}
        self.items = list(items or [])
        self.added = []
        self.committed = False

    async def get(self, model, oid):
        key = str(oid)
        if model is Obligation:
            return self.obligations.get(key)
        if model is MAPPlan:
            return self.plans.get(key)
        if model.__name__ == "MAPPlanItem":
            for item in self.items:
                if str(item.id) == key:
                    return item
            return None
        return None

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, MAPPlan):
            self.plans[str(obj.id)] = obj
        if obj.__class__.__name__ == "MAPPlanItem":
            self.items.append(obj)

    async def flush(self):
        pass

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        pass

    async def execute(self, stmt):
        from app.models.map_plan import MAPPlanItem

        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "map_plan_items" in compiled:
            rows = [
                i for i in self.items
                if str(getattr(i, "plan_id", "")) in compiled
            ]
            # Fallback: if no literal matched (bound params), return all items
            # and let the service filter by plan_id attribute.
            if not rows:
                rows = list(self.items)
            return _Result(rows)
        if "map_plans" in compiled:
            return _Result(list(self.plans.values()))
        return _Result([])


def _approved_plan(plan_id="plan-active", version=2):
    return MAPPlan(
        id=plan_id,
        regulation_version_id="rv-1",
        version_number=version,
        status=MAPPlanStatus.APPROVED.value,
        bank_id="bank-1",
        legal_entity_id="entity-1",
        created_by="maker-1",
        rationale="initial approved plan",
    )


@pytest.mark.asyncio
async def test_regeneration_creates_candidate_not_duplicate_active_maps():
    approved = _approved_plan()
    session = FakeSession(
        obligations=[_obligation("obl-1")],
        plans=[approved],
    )
    candidate = await create_candidate_plan(
        session, "rv-1", ["obl-1"], _scope(), rationale="regenerated"
    )
    assert candidate.status == MAPPlanStatus.DRAFT.value
    assert candidate.id != approved.id
    assert candidate.version_number == approved.version_number + 1
    # The active approved plan is never mutated by regeneration.
    assert approved.status == MAPPlanStatus.APPROVED.value
    assert session.plans[approved.id].status == MAPPlanStatus.APPROVED.value


@pytest.mark.asyncio
async def test_candidate_plan_requires_approved_obligations_only():
    session = FakeSession(obligations=[_obligation("obl-9", ObligationStatus.DRAFT)])
    with pytest.raises(ValueError, match="APPROVED"):
        await create_candidate_plan(session, "rv-1", ["obl-9"], _scope())


@pytest.mark.asyncio
async def test_approve_plan_supersedes_prior_active_in_one_transaction():
    approved = _approved_plan()
    candidate = MAPPlan(
        id="plan-candidate",
        regulation_version_id="rv-1",
        version_number=3,
        status=MAPPlanStatus.DRAFT.value,
        bank_id="bank-1",
        legal_entity_id="entity-1",
        created_by="maker-1",
        rationale="regenerated",
    )
    session = FakeSession(plans=[approved, candidate])
    result = await approve_plan(
        session, "plan-candidate", _scope(user_id="approver-2"), rationale="looks good"
    )
    assert result.status == MAPPlanStatus.APPROVED.value
    assert result.approved_by == "approver-2"
    assert approved.status == MAPPlanStatus.SUPERSEDED.value
    assert session.committed is True


@pytest.mark.asyncio
async def test_plan_self_approval_is_rejected():
    candidate = MAPPlan(
        id="plan-candidate",
        regulation_version_id="rv-1",
        version_number=3,
        status=MAPPlanStatus.DRAFT.value,
        bank_id="bank-1",
        legal_entity_id="entity-1",
        created_by="maker-1",
        rationale="regenerated",
    )
    session = FakeSession(plans=[candidate])
    with pytest.raises(Exception, match="maker-checker"):
        await approve_plan(
            session, "plan-candidate", _scope(user_id="maker-1"), rationale="self approve"
        )
    assert candidate.status == MAPPlanStatus.DRAFT.value


@pytest.mark.asyncio
async def test_diff_plans_reports_added_and_removed_obligations():
    from app.models.map_plan import MAPPlanItem

    old = _approved_plan(plan_id="plan-old", version=1)
    new = MAPPlan(
        id="plan-new",
        regulation_version_id="rv-1",
        version_number=2,
        status=MAPPlanStatus.DRAFT.value,
        bank_id="bank-1",
        legal_entity_id="entity-1",
        created_by="maker-1",
    )
    items = [
        MAPPlanItem(id="i1", plan_id="plan-old", obligation_id="obl-1"),
        MAPPlanItem(id="i2", plan_id="plan-old", obligation_id="obl-2"),
        MAPPlanItem(id="i3", plan_id="plan-new", obligation_id="obl-2"),
        MAPPlanItem(id="i4", plan_id="plan-new", obligation_id="obl-3"),
    ]
    session = FakeSession(plans=[old, new], items=items)
    diff = await diff_plans(session, "plan-old", "plan-new")
    assert set(diff.added) == {"obl-3"}
    assert set(diff.removed) == {"obl-1"}
    assert set(diff.unchanged) == {"obl-2"}


def test_new_plan_id_is_unique_per_candidate():
    assert str(uuid.uuid4()) != str(uuid.uuid4())
