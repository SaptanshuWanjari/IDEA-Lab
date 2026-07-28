from uuid import UUID, uuid4

import pytest

from app.services.dependency_graph import DependencyGraph


class FakeMap:
    def __init__(self, id: UUID, estimated_days: int | None = None, description: str = ""):
        self.id = id
        self.estimated_days = estimated_days
        self.description = description


class FakeDep:
    def __init__(self, map_id: UUID, depends_on_map_id: UUID):
        self.map_id = map_id
        self.depends_on_map_id = depends_on_map_id


def test_topological_order():
    a, b, c = uuid4(), uuid4(), uuid4()
    maps = [FakeMap(a), FakeMap(b), FakeMap(c)]
    deps = [FakeDep(b, a), FakeDep(c, b)]
    graph = DependencyGraph(maps, deps)
    assert graph.topological_order() == [a, b, c]


def test_cycle_detection():
    a, b, c = uuid4(), uuid4(), uuid4()
    maps = [FakeMap(a), FakeMap(b), FakeMap(c)]
    deps = [FakeDep(a, b), FakeDep(b, c), FakeDep(c, a)]
    graph = DependencyGraph(maps, deps)
    with pytest.raises(ValueError):
        graph.topological_order()


def test_blocking_analysis():
    a, b, c = uuid4(), uuid4(), uuid4()
    maps = [FakeMap(a), FakeMap(b), FakeMap(c)]
    deps = [FakeDep(b, a), FakeDep(c, b)]
    graph = DependencyGraph(maps, deps)
    assert graph.blocking_map(b) == {"blocks": [c], "blocked_by": [a]}


def test_critical_path():
    a, b, c, d = uuid4(), uuid4(), uuid4(), uuid4()
    maps = [FakeMap(a, 3), FakeMap(b, 5), FakeMap(c, 2), FakeMap(d, 4)]
    deps = [FakeDep(b, a), FakeDep(c, a), FakeDep(d, c)]
    graph = DependencyGraph(maps, deps)
    assert graph.critical_path() == [a, c, d]
