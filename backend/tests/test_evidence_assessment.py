"""Task 9: content-backed evidence assessment — a relevant filename with
irrelevant content must NOT satisfy a checklist. DB-free (FakeSession)."""

from uuid import uuid4

import pytest

from app.schemas.evidence import EvidenceChecklist, EvidenceDecision


def _checklist():
    return EvidenceChecklist(
        items=[
            {"key": "approved_by_board", "description": "Board resolution approving the action", "required": True},
            {"key": "effective_date", "description": "Date the action takes effect", "required": False},
        ]
    )


class _Scalars:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return _Scalars(self._rows)


class FakeSession:
    def __init__(self, evidence=None, assessments=None):
        from app.models.evidence import Evidence

        self.evidence = {str(e.id): e for e in (evidence or [])}
        self.assessments = list(assessments or [])
        self.added = []
        self.committed = False
        self._Evidence = Evidence

    async def get(self, model, oid):
        if model is self._Evidence:
            return self.evidence.get(str(oid))
        return None

    def add(self, obj):
        self.added.append(obj)
        if obj.__class__.__name__ == "EvidenceAssessment":
            self.assessments.append(obj)

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        pass

    async def execute(self, stmt):
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "evidence_assessments" in compiled:
            return _Result(list(self.assessments))
        return _Result([])


def _evidence(**kw):
    from app.models.evidence import Evidence

    base = dict(
        id=uuid4(),
        map_id=uuid4(),
        file_url="s3://bucket/opaque-key",
        file_name="Board_Approval.pdf",
        uploaded_by=uuid4(),
        bank_id="bank-1",
        legal_entity_id="entity-1",
    )
    base.update(kw)
    return Evidence(**base)


@pytest.mark.asyncio
async def test_relevant_filename_irrelevant_content_cannot_complete_map():
    from app.services.evidence_assessment import assess_evidence

    ev = _evidence(content_text="Quarterly cafeteria menu and office seating plan. No resolutions.")
    session = FakeSession(evidence=[ev])
    assessment = await assess_evidence(session, str(ev.id), _checklist())
    assert assessment.decision == EvidenceDecision.NEEDS_REVIEW
    assert assessment.checklist_results["approved_by_board"].passed is False
    assert assessment.advisory_only is True


@pytest.mark.asyncio
async def test_checklist_pass_case_with_supporting_content():
    from app.services.evidence_assessment import assess_evidence

    ev = _evidence(
        content_text=(
            "Board resolution 2026/14: the board approved the remediation plan. "
            "Approved by board vote on 2026-09-18. Effective date 2026-10-01."
        )
    )
    session = FakeSession(evidence=[ev])
    assessment = await assess_evidence(session, str(ev.id), _checklist())
    assert assessment.checklist_results["approved_by_board"].passed is True
    assert assessment.checklist_results["approved_by_board"].support is not None
    assert assessment.decision == EvidenceDecision.APPROVED
    assert assessment.advisory_only is True


@pytest.mark.asyncio
async def test_missing_content_is_needs_review_not_approval():
    from app.services.evidence_assessment import assess_evidence

    ev = _evidence(content_text=None)
    session = FakeSession(evidence=[ev])
    assessment = await assess_evidence(session, str(ev.id), _checklist())
    assert assessment.decision == EvidenceDecision.NEEDS_REVIEW
    assert assessment.checklist_results["approved_by_board"].passed is False
