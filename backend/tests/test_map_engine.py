from uuid import uuid4

from app.services.map_engine import MapEngine


class FakeSession:
    pass


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
