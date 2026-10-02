"""Task 7: obligation approval requires a valid citation plus maker-checker."""

import pytest

from app.models.obligation import Obligation, ObligationStatus
from app.schemas.obligation import ObligationCandidate
from app.services.citation_validator import CanonicalDocument, validate_candidate
from app.services.obligation_service import (
    CitationError,
    MakerCheckerError,
    approve_obligation,
    create_candidate,
)


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


def _obligation(creator="maker-1", **kw):
    base = dict(
        regulation_version_id="v1",
        clause_id="2.1",
        quote="Banks shall retain audit logs for at least 12 months.",
        page=1,
        obligation_text="Retain audit logs",
        created_by=creator,
        status=ObligationStatus.DRAFT,
    )
    base.update(kw)
    return Obligation(**base)


def test_create_candidate_runs_citation_validation():
    candidate = create_candidate(
        ObligationCandidate(
            clause_id="2.1",
            quote="invented rule",
            page=1,
            obligation_text="Do invented thing",
        ),
        _doc(),
    )
    assert candidate.status == ObligationStatus.REVIEWED
    assert candidate.reviewer_rationale


def test_approve_requires_valid_citation():
    ob = _obligation(quote="invented rule not in document")
    result = validate_candidate(
        ObligationCandidate(
            clause_id=ob.clause_id, quote=ob.quote, page=ob.page,
            obligation_text=ob.obligation_text,
        ),
        _doc(),
    )
    assert result.accepted is False
    with pytest.raises(CitationError):
        approve_obligation(ob, reviewer_id="approver-1", validation=result)


def test_approve_requires_different_reviewer():
    ob = _obligation(creator="maker-1")
    result = validate_candidate(
        ObligationCandidate(
            clause_id=ob.clause_id, quote=ob.quote, page=ob.page,
            obligation_text=ob.obligation_text,
        ),
        _doc(),
    )
    assert result.accepted is True
    with pytest.raises(MakerCheckerError):
        approve_obligation(ob, reviewer_id="maker-1", validation=result)


def test_approve_succeeds_with_valid_citation_and_second_person():
    ob = _obligation(creator="maker-1")
    result = validate_candidate(
        ObligationCandidate(
            clause_id=ob.clause_id, quote=ob.quote, page=ob.page,
            obligation_text=ob.obligation_text,
        ),
        _doc(),
    )
    approved = approve_obligation(ob, reviewer_id="approver-1", validation=result)
    assert approved.status == ObligationStatus.APPROVED
