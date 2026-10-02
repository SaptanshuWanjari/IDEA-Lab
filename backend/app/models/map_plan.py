"""Task 8: versioned MAP plans and formal MAP workflow states.

Regeneration creates a new candidate DRAFT plan; it never mutates the
active APPROVED plan. Approval supersedes the earlier active plan.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.models.base import Base


def _utcnow():
    return datetime.now(timezone.utc)


class MAPPlanStatus(str, Enum):
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    SUPERSEDED = "SUPERSEDED"
    REJECTED = "REJECTED"


class MAPStatus(str, Enum):
    """Canonical MAP lifecycle states.

    Values keep the legacy title-case spellings (``Pending``,
    ``InProgress``, ``Submitted``, ``Completed``) so existing persisted
    rows and reports keep working; new code should use this enum.
    """

    PENDING = "Pending"
    IN_PROGRESS = "InProgress"
    SUBMITTED = "Submitted"
    COMPLETED = "Completed"


class MAPPlan(Base):
    __tablename__ = "map_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    regulation_version_id = Column(String(100), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default=MAPPlanStatus.DRAFT.value, index=True)
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)
    created_by = Column(String(100), nullable=True)
    approved_by = Column(String(100), nullable=True)
    rationale = Column(Text, nullable=True)
    owner_department_id = Column(String(36), nullable=True)
    # Due-date basis: human-readable anchor (e.g. "30 days after gazette
    # publication") — never a bare day count without its anchor.
    due_date_basis = Column(Text, nullable=True)
    # RACI assignments for plan execution accountability.
    raci_responsible = Column(Text, nullable=True)
    raci_accountable = Column(Text, nullable=True)
    raci_consulted = Column(Text, nullable=True)
    raci_informed = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    items = relationship("MAPPlanItem", back_populates="plan", cascade="all, delete-orphan")


class MAPPlanItem(Base):
    """Link table binding one reviewed obligation to one plan version."""

    __tablename__ = "map_plan_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_id = Column(String(36), ForeignKey("map_plans.id"), nullable=False, index=True)
    obligation_id = Column(String(36), ForeignKey("obligations.id"), nullable=False, index=True)
    map_id = Column(String(36), nullable=True, index=True)
    description = Column(Text, nullable=True)
    owner_department_id = Column(String(36), nullable=True)
    due_date_basis = Column(Text, nullable=True)
    # Typed evidence requirement (e.g. "board_approval", "system_report").
    evidence_requirement = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    plan = relationship("MAPPlan", back_populates="items")
