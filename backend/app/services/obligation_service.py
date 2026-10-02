"""Task 7: cited obligation ledger service.

Invalid candidates persist only as review errors (status REVIEWED with a
rationale), never as approved obligations. Approval requires a valid
citation plus a reviewer different from the creator (maker-checker).
"""

from typing import Optional

from app.models.obligation import Obligation, ObligationStatus
from app.schemas.obligation import ObligationCandidate, ValidationResult
from app.services.citation_validator import CanonicalDocument, validate_candidate
from app.services.deadline_parser import parse_deadline

# Re-exported so callers have a single import surface for the canonical type.
__all__ = [
    "CanonicalDocument",
    "CitationError",
    "MakerCheckerError",
    "create_candidate",
    "validate_and_review",
    "approve_obligation",
]


class CitationError(ValueError):
    pass


class MakerCheckerError(PermissionError):
    pass


def _deadline_fields(quote: str, obligation_text: str) -> dict:
    parsed = parse_deadline(f"{quote} {obligation_text}")
    return {
        "deadline_kind": parsed.kind.value,
        "deadline_value": parsed.value,
        "deadline_unit": parsed.unit,
        "deadline_anchor": parsed.anchor,
    }


def create_candidate(
    candidate: ObligationCandidate,
    document: CanonicalDocument,
    *,
    regulation_version_id: Optional[str] = None,
    created_by: Optional[str] = None,
) -> Obligation:
    """Persist an LLM/extracted candidate as a ledger row.

    Accepted candidates enter DRAFT; rejected ones enter REVIEWED with the
    validator reasons as reviewer rationale so a human can inspect them.
    """
    result = validate_candidate(candidate, document)
    data = candidate.model_dump()
    dl = _deadline_fields(candidate.quote, candidate.obligation_text)
    for key in ("deadline_kind", "deadline_value", "deadline_unit", "deadline_anchor"):
        data.setdefault(key, dl[key])
    if not data.get("deadline_kind"):
        data["deadline_kind"] = dl["deadline_kind"]
    ob = Obligation(
        regulation_version_id=regulation_version_id or document.source_version_id,
        clause_id=data["clause_id"],
        quote=data["quote"],
        page=data.get("page"),
        obligation_text=data.get("obligation_text") or "",
        deadline_kind=data.get("deadline_kind"),
        deadline_value=data.get("deadline_value"),
        deadline_unit=data.get("deadline_unit"),
        deadline_anchor=data.get("deadline_anchor"),
        owner_hint=data.get("owner_hint"),
        bank_id=data.get("bank_id"),
        legal_entity_id=data.get("legal_entity_id"),
        created_by=created_by,
        status=(
            ObligationStatus.DRAFT.value
            if result.accepted
            else ObligationStatus.REVIEWED.value
        ),
        reviewer_rationale=None if result.accepted else "; ".join(result.reasons),
    )
    return ob


def validate_and_review(
    candidate: ObligationCandidate, document: CanonicalDocument
) -> ValidationResult:
    return validate_candidate(candidate, document)


def approve_obligation(
    obligation: Obligation,
    *,
    reviewer_id: str,
    validation: ValidationResult,
    rationale: Optional[str] = None,
) -> Obligation:
    """Approve an obligation. Requires valid citation + second person."""
    if not validation.accepted:
        raise CitationError(
            "cannot approve: citation invalid: " + "; ".join(validation.reasons)
        )
    creator = getattr(obligation, "created_by", None)
    if creator is not None and reviewer_id == creator:
        raise MakerCheckerError("maker-checker: reviewer must differ from creator")
    if not reviewer_id:
        raise MakerCheckerError("maker-checker: reviewer is required")
    status_val = getattr(obligation, "status", None)
    current = status_val.value if hasattr(status_val, "value") else status_val
    if current == ObligationStatus.APPROVED.value:
        raise CitationError("obligation is already approved")
    obligation.status = ObligationStatus.APPROVED.value
    obligation.reviewed_by = reviewer_id
    if rationale:
        obligation.reviewer_rationale = rationale
    return obligation


def reject_obligation(
    obligation: Obligation, *, reviewer_id: str, rationale: str
) -> Obligation:
    obligation.status = ObligationStatus.REJECTED.value
    obligation.reviewed_by = reviewer_id
    obligation.reviewer_rationale = rationale
    return obligation
