"""Task 7: invented quotes must never validate against the canonical document."""

from app.schemas.obligation import ObligationCandidate
from app.services.citation_validator import CanonicalDocument, validate_candidate


def _doc():
    return CanonicalDocument(
        source_version_id="v1",
        pages={1: "Banks shall retain audit logs for at least 12 months."},
        clauses={
            "2.1": {
                "text": "Banks shall retain audit logs for at least 12 months.",
                "page": 1,
            }
        },
    )


def test_candidate_without_matching_quote_is_rejected():
    candidate = ObligationCandidate(
        clause_id="2.1",
        quote="invented rule with no basis in the text",
        page=1,
        obligation_text="Do the invented thing",
    )
    result = validate_candidate(candidate, _doc())
    assert result.accepted is False
    assert result.reasons


def test_candidate_with_exact_quote_is_accepted():
    candidate = ObligationCandidate(
        clause_id="2.1",
        quote="Banks shall retain audit logs for at least 12 months.",
        page=1,
        obligation_text="Retain audit logs",
    )
    result = validate_candidate(candidate, _doc())
    assert result.accepted is True
