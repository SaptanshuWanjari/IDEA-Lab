"""Task 9: content-backed evidence review.

``assess_evidence`` compares checklist items against the verified evidence
content (never the filename) and returns an advisory draft. ``approve_evidence``
records the binding human decision under maker-checker control; only an
``APPROVED`` assessment enables ``MAPStatus.COMPLETED``.
"""

import re
from typing import Optional

from sqlalchemy import select

from app.models.evidence import Evidence
from app.models.evidence_assessment import EvidenceAssessment
from app.schemas.evidence import (
    AssessmentDraft,
    ChecklistItem,
    ChecklistItemResult,
    EvidenceChecklist,
    EvidenceDecision,
)
from app.services.authorization import AuthorizationError, Capability, RequestScope, authorize

_STOPWORDS = frozenset({"by", "the", "a", "an", "of", "for", "to", "and", "or", "on", "in"})

# Decisions that return the evidence to the submitter; a human reason is mandatory.
_RATIONALE_REQUIRED = frozenset(
    {EvidenceDecision.REJECTED, EvidenceDecision.NEEDS_REVIEW, EvidenceDecision.REQUEST_INFO}
)


def _key_tokens(key: str) -> list[str]:
    return [
        token
        for token in re.split(r"[_\-\s]+", key.lower())
        if token and token not in _STOPWORDS
    ]


def _supporting_quote(content: str, tokens: list[str]) -> Optional[str]:
    """Return the first sentence containing a checklist token as cited support."""
    sentences = re.split(r"(?<=[.!?])\s+", content.strip())
    for sentence in sentences:
        lowered = sentence.lower()
        if any(token in lowered for token in tokens):
            snippet = sentence.strip()
            return snippet[:280] if len(snippet) > 280 else snippet
    return None


def evaluate_item(item: ChecklistItem, content_text: Optional[str]) -> ChecklistItemResult:
    """Compare one checklist item against evidence content.

    A filename such as ``Board_Approval.pdf`` carries no weight here: when
    the content is missing or does not contain the item's key terms, the
    item fails and the caller must treat the evidence as needing review.
    """
    tokens = _key_tokens(item.key)
    if not content_text or not content_text.strip():
        return ChecklistItemResult(
            key=item.key, passed=False, required=item.required, missing_terms=tokens
        )
    lowered = content_text.lower()
    missing = [token for token in tokens if token not in lowered]
    if missing:
        return ChecklistItemResult(
            key=item.key, passed=False, required=item.required, missing_terms=missing
        )
    return ChecklistItemResult(
        key=item.key,
        passed=True,
        required=item.required,
        support=_supporting_quote(content_text, tokens),
    )


def evaluate_checklist(
    content_text: Optional[str], checklist: EvidenceChecklist
) -> dict[str, ChecklistItemResult]:
    return {item.key: evaluate_item(item, content_text) for item in checklist.items}


def _coerce_checklist(checklist) -> EvidenceChecklist:
    if isinstance(checklist, EvidenceChecklist):
        return checklist
    if isinstance(checklist, dict):
        return EvidenceChecklist(**checklist)
    return EvidenceChecklist(items=[ChecklistItem(**i) if isinstance(i, dict) else i for i in checklist])


def _coerce_decision(decision) -> EvidenceDecision:
    if isinstance(decision, EvidenceDecision):
        return decision
    for member in EvidenceDecision:
        if member.value == decision or member.name == decision:
            return member
    raise ValueError(f"unknown evidence decision: {decision!r}")


async def assess_evidence(session, evidence_id, checklist, content_text=None) -> AssessmentDraft:
    """Build an advisory assessment draft from verified evidence content.

    The filename is deliberately ignored: relevant names with irrelevant
    content yield ``NEEDS_REVIEW`` with the failed checklist items cited.
    """
    evidence = await session.get(Evidence, evidence_id)
    if evidence is None:
        raise ValueError(f"Evidence not found: {evidence_id}")
    checklist = _coerce_checklist(checklist)
    text = content_text if content_text is not None else getattr(evidence, "content_text", None)
    results = evaluate_checklist(text, checklist)
    missing = [
        key for key, result in results.items() if result.required and not result.passed
    ]
    if not text or not text.strip():
        missing = [item.key for item in checklist.items if item.required]
        note = "no verified content available; filename alone is never sufficient"
        decision = EvidenceDecision.NEEDS_REVIEW
    elif missing:
        note = "content does not support required checklist elements"
        decision = EvidenceDecision.NEEDS_REVIEW
    else:
        note = "advisory content match; human approval is still required"
        decision = EvidenceDecision.APPROVED
    return AssessmentDraft(
        evidence_id=str(getattr(evidence, "id", evidence_id)),
        decision=decision,
        checklist_results=results,
        missing_elements=missing,
        advisory_only=True,
        note=note,
    )


async def approve_evidence(session, evidence_id, decision, scope: RequestScope, rationale=None) -> EvidenceAssessment:
    """Record the binding human decision on an evidence item.

    Enforces maker-checker (the submitter cannot approve their own
    evidence) and requires a rationale for rejections/requests. Only an
    ``APPROVED`` assessment counts toward MAP completion.
    """
    verdict = _coerce_decision(decision)
    evidence = await session.get(Evidence, evidence_id)
    if evidence is None:
        raise ValueError(f"Evidence not found: {evidence_id}")

    # Scope confidentiality first, then maker-checker against the submitter.
    authorize(scope, Capability.APPROVE_EVIDENCE, evidence)

    if verdict in _RATIONALE_REQUIRED and not (rationale or "").strip():
        raise ValueError(f"a rationale is required for decision {verdict.value}")

    submitter_id = str(getattr(evidence, "uploaded_by", ""))
    assessment = EvidenceAssessment(
        evidence_id=getattr(evidence, "id", None),
        map_id=getattr(evidence, "map_id", None),
        checklist=None,
        decision=verdict.value,
        assessor_id=str(scope.user_id),
        submitter_id=submitter_id,
        rationale=(rationale or "").strip() or None,
        bank_id=getattr(evidence, "bank_id", None),
        legal_entity_id=getattr(evidence, "legal_entity_id", None),
    )
    session.add(assessment)
    # Attach the latest binding decision to the evidence row for reports.
    try:
        evidence.assessment_decision = verdict.value
    except Exception:
        pass
    await session.commit()
    try:
        await session.refresh(assessment)
    except Exception:
        pass
    return assessment


async def latest_assessments_for_evidence(session, evidence_ids) -> dict:
    """Return the latest assessment per evidence id (best-effort; {} on failure)."""
    ids = [str(i) for i in evidence_ids]
    if not ids:
        return {}
    try:
        result = await session.execute(
            select(EvidenceAssessment).where(EvidenceAssessment.evidence_id.in_(evidence_ids))
        )
        rows = result.scalars().all()
    except Exception:
        return {}
    latest = {}
    for row in rows:
        key = str(getattr(row, "evidence_id", ""))
        current = latest.get(key)
        created = getattr(row, "created_at", None)
        current_created = getattr(current, "created_at", None) if current else None
        if current is None or (created is not None and (current_created is None or created >= current_created)):
            latest[key] = row
    # Fall back to keying by the string form when UUID objects differ.
    by_str = {str(getattr(r, "evidence_id", "")): r for r in rows}
    merged = dict(latest)
    for raw in ids:
        if raw not in merged and raw in by_str:
            merged[raw] = by_str[raw]
    return merged
