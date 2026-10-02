"""Task 7: deterministic deadline semantics for obligation extraction.

Retention periods ("retain ... for at least 12 months") are storage duties,
never implementation due dates. Relative deadlines ("within 30 days of X")
keep their anchor event. Periodic duties ("quarterly") and absolute calendar
dates are distinguished from one another and from the absence of a deadline.
"""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class DeadlineKind(str, Enum):
    absolute = "absolute"
    relative = "relative"
    periodic = "periodic"
    retention = "retention"
    none = "none"


@dataclass
class ParsedDeadline:
    kind: DeadlineKind
    value: Optional[int] = None
    unit: Optional[str] = None
    anchor: Optional[str] = None
    raw: str = ""


_RETENTION_RES = [
    re.compile(
        r"retain\s+[^.]{0,120}?\s+for\s+at\s+least\s+(?P<value>\d+)\s+"
        r"(?P<unit>hours?|days?|weeks?|months?|years?)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:retain|retention|maintain|preserve|preserve[sd]?|store|archive)\s+"
        r"[^.]{0,120}?\s+for\s+(?:a\s+minimum\s+period\s+of|at\s+least|minimum\s+of)\s+"
        r"(?P<value>\d+)\s+(?P<unit>hours?|days?|weeks?|months?|years?)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:records?|logs?|data|documents?)\s+(?:relating\s+to\s+[^.]{0,80}?\s+)?"
        r"shall\s+be\s+(?:preserved|retained|maintained|stored)\s+for\s+"
        r"(?:at\s+least\s+)?(?P<value>\d+)\s+(?P<unit>hours?|days?|weeks?|months?|years?)",
        re.IGNORECASE,
    ),
]

_RELATIVE_RES = [
    re.compile(
        r"within\s+(?P<value>\d+)\s+(?P<unit>hours?|days?|weeks?|months?|years?)"
        r"(?:\s+of\s+(?P<anchor>[^.]+))?",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:no\s+later\s+than|not\s+later\s+than)\s+(?P<value>\d+)\s+"
        r"(?P<unit>hours?|days?|weeks?|months?|years?)\s+(?:after|from|of)\s+(?P<anchor>[^.]+)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:by|within)\s+(?P<value>\d+)\s+(?P<unit>hours?|days?|weeks?|months?|years?)\s+"
        r"(?:after|from|following)\s+(?P<anchor>[^.]+)",
        re.IGNORECASE,
    ),
]

_PERIODIC_RES = [
    re.compile(r"\b(?P<word>daily|weekly|monthly|quarterly|half-?yearly|yearly|annually)\b", re.IGNORECASE),
    re.compile(r"\bevery\s+(?P<value>\d+\s+)?(?P<unit>day|week|month|quarter|year)s?\b", re.IGNORECASE),
    re.compile(r"\bonce\s+(?:a|every)\s+(?P<unit>day|week|month|quarter|year)\b", re.IGNORECASE),
]

_ABSOLUTE_RES = [
    re.compile(
        r"\b(?P<month>January|February|March|April|May|June|July|August|September|October|November|December)"
        r"\s+(?P<day>\d{1,2}),?\s+(?P<year>\d{4})\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(?P<day>\d{1,2})\s+(?P<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?P<year>\d{4})\b", re.IGNORECASE),
    re.compile(r"\b(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})\b"),
]


def _plural(unit: str) -> str:
    unit = unit.lower().rstrip("s")
    mapping = {
        "hour": "hours", "day": "days", "week": "weeks",
        "month": "months", "year": "years", "quarter": "quarters",
    }
    return mapping.get(unit, unit + "s")


def parse_deadline(text: str) -> ParsedDeadline:
    """Deterministically classify the deadline semantics of a clause sentence."""
    raw = text or ""
    # Retention first: a retention sentence also contains a duration that must
    # not be mistaken for an implementation due date.
    for rx in _RETENTION_RES:
        m = rx.search(raw)
        if m:
            return ParsedDeadline(
                kind=DeadlineKind.retention,
                value=int(m.group("value")),
                unit=_plural(m.group("unit")),
                raw=raw,
            )
    for rx in _RELATIVE_RES:
        m = rx.search(raw)
        if m:
            anchor = None
            try:
                anchor = m.group("anchor")
            except IndexError:
                anchor = None
            anchor = anchor.strip().rstrip(".") if anchor else None
            return ParsedDeadline(
                kind=DeadlineKind.relative,
                value=int(m.group("value")),
                unit=_plural(m.group("unit")),
                anchor=anchor,
                raw=raw,
            )
    for rx in _PERIODIC_RES:
        m = rx.search(raw)
        if m:
            word = m.groupdict().get("word")
            if word:
                return ParsedDeadline(
                    kind=DeadlineKind.periodic, value=None,
                    unit=word.lower().replace("-", ""), raw=raw,
                )
            return ParsedDeadline(
                kind=DeadlineKind.periodic,
                value=int(m.group("value").strip()) if m.group("value") else 1,
                unit=_plural(m.group("unit")),
                raw=raw,
            )
    for rx in _ABSOLUTE_RES:
        m = rx.search(raw)
        if m:
            return ParsedDeadline(
                kind=DeadlineKind.absolute, value=None, unit=None,
                anchor=m.group(0), raw=raw,
            )
    return ParsedDeadline(kind=DeadlineKind.none, raw=raw)
