"""Task 7: deadline semantics must not collapse retention into implementation due dates."""

from app.services.deadline_parser import DeadlineKind, parse_deadline


def test_retention_is_not_an_implementation_deadline():
    deadline = parse_deadline("Banks shall retain audit logs for at least 12 months")
    assert deadline.kind == DeadlineKind.retention
    assert deadline.value == 12 and deadline.unit == "months"


def test_within_30_days_keeps_anchor():
    deadline = parse_deadline(
        "Banks shall report cyber incidents within 30 days of detection"
    )
    assert deadline.kind == DeadlineKind.relative
    assert deadline.value == 30 and deadline.unit == "days"
    assert deadline.anchor is not None and "detection" in deadline.anchor.lower()


def test_periodic_deadline_detected():
    deadline = parse_deadline("Banks shall submit returns quarterly")
    assert deadline.kind == DeadlineKind.periodic
