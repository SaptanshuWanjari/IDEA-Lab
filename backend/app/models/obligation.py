"""Task 7: versioned, cited obligation ledger records."""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.models.base import Base


def _utcnow():
    return datetime.now(timezone.utc)


class ObligationStatus(str, Enum):
    DRAFT = "DRAFT"
    REVIEWED = "REVIEWED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Obligation(Base):
    __tablename__ = "obligations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    regulation_version_id = Column(String(100), nullable=False, index=True)
    clause_id = Column(String(50), nullable=False)
    quote = Column(Text, nullable=False)
    page = Column(Integer, nullable=True)
    obligation_text = Column(Text, nullable=False, default="")
    deadline_kind = Column(String(20), nullable=True)
    deadline_value = Column(Integer, nullable=True)
    deadline_unit = Column(String(20), nullable=True)
    deadline_anchor = Column(Text, nullable=True)
    owner_hint = Column(String(200), nullable=True)
    status = Column(String(20), nullable=False, default=ObligationStatus.DRAFT.value)
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)
    created_by = Column(String(100), nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewer_rationale = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
