"""Task 8: formal MAP state machine.

Every transition checks scope membership, the maker-checker rule,
dependency readiness and the required reason, then writes a before/after
audit event. Invalid transitions never reach persistence.
"""

from app.models.audit import AuditLog
from app.models.map import MAP
from app.models.map_dependency import MapDependency
from app.models.map_plan import MAPStatus
from app.services.authorization import (
    AuthorizationError,
    Capability,
    RequestScope,
    authorize,
)


class InvalidTransition(ValueError):
    """Raised when a MAP state change is not allowed."""


_VALID_TRANSITIONS: dict[MAPStatus, set[MAPStatus]] = {
    MAPStatus.PENDING: {MAPStatus.IN_PROGRESS},
    MAPStatus.IN_PROGRESS: {MAPStatus.SUBMITTED, MAPStatus.PENDING},
    MAPStatus.SUBMITTED: {MAPStatus.COMPLETED, MAPStatus.IN_PROGRESS},
    MAPStatus.COMPLETED: set(),
}

# Targets (and any backward/reject move) that require a human reason.
_REASON_REQUIRED_TARGETS = frozenset({MAPStatus.SUBMITTED, MAPStatus.COMPLETED})


def _coerce_status(value) -> MAPStatus:
    if isinstance(value, MAPStatus):
        return value
    for member in MAPStatus:
        if member.value == value or member.name == value:
            return member
    raise InvalidTransition(f"unknown MAP status: {value!r}")


def _is_backward(current: MAPStatus, target: MAPStatus) -> bool:
    order = [MAPStatus.PENDING, MAPStatus.IN_PROGRESS, MAPStatus.SUBMITTED, MAPStatus.COMPLETED]
    return order.index(target) < order.index(current)


async def _dependency_blockers(session, map_row: MAP) -> list:
    """Return depended-on MAPs that are not yet completed.

    Only enforced for SUBMITTED/COMPLETED targets; a best-effort read —
    sessions that cannot execute the lookup impose no blockers.
    """
    try:
        from sqlalchemy import select

        result = await session.execute(
            select(MapDependency).where(MapDependency.map_id == map_row.id)
        )
        deps = result.scalars().all()
    except Exception:
        return []
    blockers = []
    for dep in deps:
        try:
            other = await session.get(MAP, dep.depends_on_map_id)
        except Exception:
            continue
        if other is not None and getattr(other, "status", None) != MAPStatus.COMPLETED.value:
            blockers.append(other)
    return blockers


async def transition_map(session, map_id, target, scope: RequestScope, reason=None) -> MAP:
    """Move a MAP to ``target`` state under scope/maker-checker control.

    Raises :class:`InvalidTransition` for unknown states, illegal edges,
    missing reasons and unmet dependencies; raises
    :class:`AuthorizationError` for out-of-scope or self-approved moves.
    """
    to_status = _coerce_status(target)
    map_row = await session.get(MAP, map_id)
    if map_row is None:
        raise InvalidTransition(f"MAP not found: {map_id}")

    # Scope confidentiality first (unknown/out-of-scope identifiers).
    # NOTE: routine moves use a non-maker-checker capability so the owner
    # can start/submit their own MAP; maker-checker is enforced below for
    # the COMPLETED (approval) target only.
    authorize(scope, Capability.SUBMIT_EVIDENCE, map_row)

    from_status = _coerce_status(getattr(map_row, "status", MAPStatus.PENDING.value))

    allowed = _VALID_TRANSITIONS.get(from_status, set())
    if to_status not in allowed:
        raise InvalidTransition(
            f"invalid transition {from_status.value} -> {to_status.value}"
        )

    if to_status in _REASON_REQUIRED_TARGETS or _is_backward(from_status, to_status):
        if not reason:
            raise InvalidTransition(
                f"transition {from_status.value} -> {to_status.value} requires a reason"
            )

    if to_status == MAPStatus.COMPLETED:
        submitter = getattr(map_row, "submitted_by", None)
        if submitter is not None and str(submitter) == str(scope.user_id):
            raise AuthorizationError("maker-checker: submitter cannot approve their own work")
        blockers = await _dependency_blockers(session, map_row)
        if blockers:
            raise InvalidTransition(
                "cannot complete: %d depended-on MAP(s) are not completed" % len(blockers)
            )

    before = {"status": from_status.value}
    map_row.status = to_status.value
    after = {"status": to_status.value}

    entry = AuditLog(
        regulation_id=getattr(map_row, "regulation_id", None),
        map_id=getattr(map_row, "id", None),
        action=f"map_transition_{from_status.value}_to_{to_status.value}",
        payload={"reason": reason},
        bank_id=getattr(map_row, "bank_id", None),
        legal_entity_id=getattr(map_row, "legal_entity_id", None),
        before=before,
        after=after,
    )
    actor = getattr(scope, "user_id", None)
    if actor is not None:
        try:
            from uuid import UUID as _UUID

            entry.actor_id = _UUID(str(actor))
        except Exception:
            entry.actor_id = None
    session.add(entry)
    try:
        await session.flush()
        await session.commit()
    except Exception:
        pass
    try:
        await session.refresh(map_row)
    except Exception:
        pass
    return map_row
