"""Task 5: versioned regulation records.

Re-ingestion/reprocessing creates a NEW RegulationVersion row; existing
versions are never overwritten.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


def _utcnow():
    return datetime.now(timezone.utc)


class RegulationVersion(Base):
    __tablename__ = "regulation_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    regulation_id = Column(UUID(as_uuid=True), ForeignKey("regulations.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    content_hash = Column(String(128), nullable=True, index=True)
    status = Column(String(50), nullable=False, default="draft")
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    regulation = relationship("Regulation", back_populates="versions")
