from uuid import uuid4

import pytest

from app.models.map import MAP
from app.services.validation import ValidationService


class FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return self._items


class FakeSession:
    def __init__(self, map_obj=None, maps=None):
        self._map = map_obj
        self._maps = maps or []

    async def get(self, model, id):
        return self._map

    async def execute(self, stmt):
        return FakeResult(self._maps)


@pytest.mark.asyncio
async def test_check_completeness_keyword_overlap():
    m = MAP(
        id=uuid4(),
        regulation_id=uuid4(),
        owner_department_id=uuid4(),
        description="Fire safety",
        evidence_required="fire safety certificate",
    )
    session = FakeSession(map_obj=m)
    service = ValidationService(session)
    result = await service.check_completeness(str(m.id), "fire_safety_certificate.pdf")
    assert result["complete"] is True
    assert "fire" in result["overlap_keywords"]
    assert "safety" in result["overlap_keywords"]
    assert result["method"] == "keyword"


@pytest.mark.asyncio
async def test_check_completeness_no_overlap_needs_review():
    m = MAP(
        id=uuid4(),
        regulation_id=uuid4(),
        owner_department_id=uuid4(),
        description="Fire safety",
        evidence_required="fire safety certificate",
    )
    session = FakeSession(map_obj=m)
    service = ValidationService(session)
    result = await service.check_completeness(str(m.id), "invoice_2024.pdf")
    assert result["complete"] is False
    assert result["needs_manual_review"] is True
    assert result["method"] == "keyword"


@pytest.mark.asyncio
async def test_functional_coverage_counts_clauses():
    reg_id = uuid4()
    m1 = MAP(
        id=uuid4(),
        regulation_id=reg_id,
        owner_department_id=uuid4(),
        description="M1",
        status="Completed",
        source_clauses=["4.1", "4.2"],
    )
    m2 = MAP(
        id=uuid4(),
        regulation_id=reg_id,
        owner_department_id=uuid4(),
        description="M2",
        status="Pending",
        source_clauses=["4.3"],
    )
    session = FakeSession(maps=[m1, m2])
    service = ValidationService(session)
    result = await service.functional_coverage(str(reg_id))
    assert result["total_clauses"] == 3
    assert result["covered_clauses"] == 2
    assert "4.3" in result["uncovered_clauses"]
    assert result["coverage_pct"] == pytest.approx(200 / 3)
