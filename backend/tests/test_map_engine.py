from uuid import UUID, uuid4

import pytest

from app.models.department import Department
from app.models.map import MAP
from app.schemas.agent import GeneratedMAP
from app.services.map_engine import MapEngine


class FakeSession:
    def __init__(self):
        self._dept = Department(id=uuid4(), name="IT")
        self.added = []
        self.flushed = False
        self.committed = False
        self.rolled_back = False

    async def execute(self, stmt):
        compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        is_case_insensitive = "lower" in compiled.lower()

        class R:
            def scalar_one_or_none(_self):
                return self._dept if is_case_insensitive else None
        return R()

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flushed = True
        # assign fake ids to MAP objects
        for obj in self.added:
            if isinstance(obj, MAP) and not obj.id:
                obj.id = uuid4()

    async def commit(self):
        self.committed = True

    async def rollback(self):
        self.rolled_back = True

    async def refresh(self, obj):
        pass


@pytest.mark.asyncio
async def test_from_agent_output_matches_department_case_insensitive():
    session = FakeSession()
    engine = MapEngine(session)
    generated = [
        GeneratedMAP(
            description="A",
            owner_department="it",
            deadline_days=7,
            confidence=0.9,
            reasoning="r1",
            source_clauses=["1"],
        )
    ]
    maps = await engine.from_agent_output(str(uuid4()), generated)
    assert len(maps) == 1
    assert maps[0].owner_department_id == session._dept.id


def test_detect_cycle():
    engine = MapEngine(FakeSession())
    a, b, c = uuid4(), uuid4(), uuid4()
    assert engine.detect_cycle([(a, b), (b, c)]) is False
    assert engine.detect_cycle([(a, b), (b, c), (c, a)]) is True


def test_detect_cycle_no_deps():
    engine = MapEngine(FakeSession())
    assert engine.detect_cycle([]) is False


def test_detect_cycle_self_loop():
    engine = MapEngine(FakeSession())
    a = uuid4()
    assert engine.detect_cycle([(a, a)]) is True


@pytest.mark.asyncio
async def test_save_draft_detects_cycle():
    session = FakeSession()
    engine = MapEngine(session)
    generated = [
        GeneratedMAP(
            description="A",
            owner_department="IT",
            deadline_days=7,
            confidence=0.9,
            reasoning="r1",
            source_clauses=["1"],
        ),
        GeneratedMAP(
            description="B",
            owner_department="IT",
            deadline_days=7,
            confidence=0.9,
            reasoning="r2",
            source_clauses=["2"],
        ),
    ]
    # B depends on A and A depends on B -> cycle
    dependencies = [
        {"map_index": 1, "depends_on_indices": [0]},
        {"map_index": 0, "depends_on_indices": [1]},
    ]
    with pytest.raises(ValueError, match="Cycle detected"):
        await engine.save_draft(str(uuid4()), [g.model_dump() for g in generated], dependencies)
    assert session.rolled_back is True
