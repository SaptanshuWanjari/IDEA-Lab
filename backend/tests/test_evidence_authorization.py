"""Task 9: evidence maker-checker authorization and approval-gated MAP
completion. DB-free (FakeSession)."""

from uuid import uuid4

import pytest

from app.models.map import MAP
from app.models.map_plan import MAPStatus
from app.schemas.evidence import EvidenceDecision
from app.services.authorization import AuthorizationError, RequestScope


def _scope(user_id):
    return RequestScope(
        user_id=user_id,
        bank_id="bank-1",
        legal_entity_ids=["entity-1"],
        department_ids=[],
        role_codes=["compliance_approver"],
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
    def __init__(self, evidence=None, maps=None, assessments=None, deps=None):
        from app.models.evidence import Evidence

        self.evidence = {str(e.id): e for e in (evidence or [])}
        self.maps = {str(m.id): m for m in (maps or [])}
        self.assessments = list(assessments or [])
        self.deps = list(deps or [])
        self.added = []
        self.committed = False
        self._Evidence = Evidence

    async def get(self, model, oid):
        from app.models.map import MAP as _MAP

        if model is self._Evidence:
            return self.evidence.get(str(oid))
        if model is _MAP:
            return self.maps.get(str(oid))
        name = getattr(model, "__name__", "")
        if name == "EvidenceAssessment":
            for a in self.assessments:
                if str(getattr(a, "id", "")) == str(oid):
                    return a
            return None
        return None

    def add(self, obj):
        self.added.append(obj)
        if obj.__class__.__name__ == "EvidenceAssessment":
            self.assessments.append(obj)

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
        if "evidence_assessments" in compiled:
            rows = list(self.assessments)
            if "APPROVED" in compiled:
                rows = [a for a in rows if getattr(a, "decision", None) == "APPROVED"]
            return _Result(rows)
        return _Result([])


def _evidence(submitter="submitter-1", **kw):
    from app.models.evidence import Evidence

    base = dict(
        id=uuid4(),
        map_id=uuid4(),
        file_url="s3://bucket/opaque-key",
        file_name="Board_Approval.pdf",
        uploaded_by=submitter,
        bank_id="bank-1",
        legal_entity_id="entity-1",
        content_text="Board resolution: approved by board vote. Effective date 2026-10-01.",
    )
    base.update(kw)
    return Evidence(**base)


def _map(status="Submitted", submitted_by="submitter-1", **kw):
    base = dict(
        id=uuid4(),
        regulation_id=uuid4(),
        owner_department_id=uuid4(),
        description="Remediate finding",
        status=status,
        approval_state="Submitted",
        bank_id="bank-1",
        legal_entity_id="entity-1",
        submitted_by=submitted_by,
    )
    base.update(kw)
    return MAP(**base)


@pytest.mark.asyncio
async def test_evidence_submitter_cannot_approve():
    from app.services.evidence_assessment import approve_evidence

    ev = _evidence(submitter="submitter-1")
    session = FakeSession(evidence=[ev])
    with pytest.raises(AuthorizationError, match="maker-checker"):
        await approve_evidence(
            session, str(ev.id), EvidenceDecision.APPROVED, _scope("submitter-1"), "looks fine"
        )


@pytest.mark.asyncio
async def test_approver_can_approve_with_rationale():
    from app.services.evidence_assessment import approve_evidence

    ev = _evidence(submitter="submitter-1")
    session = FakeSession(evidence=[ev])
    assessment = await approve_evidence(
        session, str(ev.id), EvidenceDecision.APPROVED, _scope("approver-9"), "verified board minutes"
    )
    assert assessment.decision == EvidenceDecision.APPROVED.value
    assert assessment.assessor_id == "approver-9"
    assert assessment.submitter_id == "submitter-1"
    assert session.committed is True


@pytest.mark.asyncio
async def test_rejection_requires_rationale():
    from app.services.evidence_assessment import approve_evidence

    ev = _evidence(submitter="submitter-1")
    session = FakeSession(evidence=[ev])
    with pytest.raises(ValueError, match="[Rr]ationale"):
        await approve_evidence(
            session, str(ev.id), EvidenceDecision.REJECTED, _scope("approver-9"), ""
        )


@pytest.mark.asyncio
async def test_completion_requires_approved_evidence():
    from app.services.workflow import InvalidTransition, transition_map

    ev = _evidence(submitter="submitter-1")
    m = _map(status="Submitted", submitted_by="submitter-1")
    ev.map_id = m.id
    session = FakeSession(evidence=[ev], maps=[m])
    with pytest.raises(InvalidTransition, match="approved evidence"):
        await transition_map(
            session, str(m.id), MAPStatus.COMPLETED, _scope("approver-9"), "done"
        )
    assert m.status == "Submitted"


@pytest.mark.asyncio
async def test_completion_succeeds_with_approved_evidence():
    from app.services.evidence_assessment import approve_evidence
    from app.services.workflow import transition_map

    ev = _evidence(submitter="submitter-1")
    m = _map(status="Submitted", submitted_by="submitter-1")
    ev.map_id = m.id
    session = FakeSession(evidence=[ev], maps=[m])
    await approve_evidence(
        session, str(ev.id), EvidenceDecision.APPROVED, _scope("approver-9"), "verified"
    )
    result = await transition_map(
        session, str(m.id), MAPStatus.COMPLETED, _scope("approver-9"), "evidence accepted"
    )
    assert result.status == MAPStatus.COMPLETED.value
