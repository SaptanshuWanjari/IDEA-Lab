"""Central object-level authorization for the single-bank pilot.

Going forward, service methods must accept ``scope: RequestScope`` rather
than a bare ``user_id``. Router/dependency-layer enforcement (returning
404 for out-of-scope identifiers) is the confidentiality boundary; services
additionally filter with :func:`scoped_select`.

Reuses :class:`AuthorizationError` from provisioning to avoid a duplicate
exception type.
"""

import enum
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select

from app.services.provisioning import AuthorizationError  # noqa: F401 — canonical error

__all__ = [
    "AuthorizationError",
    "Capability",
    "RequestScope",
    "authorize",
    "scoped_select",
]

LEGACY_BANK_ID = "legacy-demo-bank"
LEGACY_ENTITY_ID = "legacy-entity"

# Actions subject to maker-checker: the approver must differ from the
# submitter/creator of the resource.
_MAKER_CHECKER_ACTIONS = frozenset(
    {"APPROVE_EVIDENCE", "APPROVE_PLAN", "APPROVE_MAP", "TRANSITION_MAP"}
)


class Capability(str, enum.Enum):
    VIEW_REGULATION = "view_regulation"
    LIST_REGULATIONS = "list_regulations"
    APPROVE_EVIDENCE = "approve_evidence"
    APPROVE_PLAN = "approve_plan"
    APPROVE_MAP = "approve_map"
    TRANSITION_MAP = "transition_map"
    SUBMIT_EVIDENCE = "submit_evidence"
    VIEW_REPORT = "view_report"


@dataclass
class RequestScope:
    user_id: str
    bank_id: str
    legal_entity_ids: list[str] = field(default_factory=list)
    department_ids: list[str] = field(default_factory=list)
    role_codes: list[str] = field(default_factory=list)


def _resource_bank(resource: Any) -> str | None:
    return getattr(resource, "bank_id", None)


def _resource_entity(resource: Any) -> str | None:
    return getattr(resource, "legal_entity_id", None)


def _resource_submitter(resource: Any) -> str | None:
    for attr in ("submitted_by", "uploaded_by", "created_by"):
        value = getattr(resource, attr, None)
        if value is not None:
            return str(value)
    return None


def authorize(scope: RequestScope, action: Capability, resource: Any) -> None:
    """Enforce object-level access; raises AuthorizationError on denial.

    - Resource bank/entity (when set) must be inside the scope. Legacy
      rows with NULL scope are readable only by the legacy fallback scope.
    - Approval/transition actions enforce maker-checker: the acting user
      must differ from the resource submitter/creator.
    """
    bank = _resource_bank(resource)
    if bank is not None and bank != scope.bank_id:
        raise AuthorizationError("resource is outside your bank scope")
    entity = _resource_entity(resource)
    if entity is not None and entity not in scope.legal_entity_ids:
        raise AuthorizationError("resource is outside your legal-entity scope")
    if action.name in _MAKER_CHECKER_ACTIONS:
        submitter = _resource_submitter(resource)
        if submitter is not None and submitter == str(scope.user_id):
            raise AuthorizationError("maker-checker: submitter cannot approve their own work")


def scoped_select(model: type, scope: RequestScope):
    """Return a SELECT for ``model`` filtered to the request scope.

    Models without scope attributes are returned unfiltered (graceful
    degradation for lookup tables such as Department).
    """
    stmt = select(model)
    bank_attr = getattr(model, "bank_id", None)
    # getattr on a mapped class returns the InstrumentedAttribute; on a
    # plain object (tests) it returns the value — only filter when the
    # attribute looks like a SQLAlchemy column.
    if hasattr(bank_attr, "__clause_element__"):
        stmt = stmt.where(model.bank_id == scope.bank_id)
    entity_attr = getattr(model, "legal_entity_id", None)
    if hasattr(entity_attr, "__clause_element__"):
        stmt = stmt.where(model.legal_entity_id.in_(scope.legal_entity_ids))
    return stmt
