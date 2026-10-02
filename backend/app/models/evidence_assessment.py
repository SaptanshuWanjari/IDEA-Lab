"""Task 9: binding evidence assessments.

An advisory :class:`AssessmentDraft` (see services/evidence_assessment.py)
never completes a MAP. Only a persisted ``EvidenceAssessment`` with
``decision == APPROVED`` and a non-null ``assessor_id`` — created by a
different user than the submitter (maker-checker) — counts toward
``MAPStatus.COMPLETED``.
"""

from sqlalchemy import JSON, Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin, new_uuid


class EvidenceAssessment(Base, TimestampMixin):
    __tablename__ = "evidence_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id"), nullable=False, index=True)
    # Denormalized owning MAP so the workflow gate needs no join.
    map_id = Column(UUID(as_uuid=True), ForeignKey("maps.id"), nullable=True, index=True)
    checklist = Column(JSON, nullable=True)
    decision = Column(String(20), nullable=False, index=True)
    assessor_id = Column(String(100), nullable=True, index=True)
    submitter_id = Column(String(100), nullable=True)
    rationale = Column(Text, nullable=True)
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)
