"""Task 10: AI run provenance and immutable report snapshots.

:class:`AIRun` records one LLM pipeline stage: model/provider, prompt
template version, input/output hashes, retrieval chunk IDs, validator
result and reviewer outcome — so every AI-assisted decision is traceable
without a live model.

:class:`ReportSnapshot` is an immutable, deep-copied JSON payload built by
``build_report_snapshot`` (see services/report_snapshot.py): data cutoff,
regulation/plan versions, obligation dispositions, MAP/evidence states and
artifact hashes. Historical reports are reproducible because the payload
never references mutable rows.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, String, Text

from app.models.base import Base


def _utcnow():
    return datetime.now(timezone.utc)


class AIRun(Base):
    __tablename__ = "ai_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    stage = Column(String(50), nullable=False, index=True)
    model_id = Column(String(200), nullable=False)
    provider = Column(String(50), nullable=False, default="ollama")
    prompt_version = Column(String(100), nullable=False)
    # {"chunk_ids": [...], "regulation_version_ids": [...], ...}
    retrieval_manifest = Column(JSON, nullable=False, default=dict)
    input_hash = Column(String(64), nullable=False)
    output_hash = Column(String(64), nullable=False)
    validator_result = Column(JSON, nullable=True)
    reviewer_outcome = Column(String(50), nullable=True)
    correlation_id = Column(String(100), nullable=True, index=True)
    regulation_version_id = Column(String(100), nullable=True, index=True)
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "stage": self.stage,
            "model_id": self.model_id,
            "provider": self.provider,
            "prompt_version": self.prompt_version,
            "retrieval_manifest": self.retrieval_manifest,
            "input_hash": self.input_hash,
            "output_hash": self.output_hash,
            "validator_result": self.validator_result,
            "reviewer_outcome": self.reviewer_outcome,
            "correlation_id": self.correlation_id,
            "regulation_version_id": self.regulation_version_id,
            "bank_id": self.bank_id,
            "legal_entity_id": self.legal_entity_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ReportSnapshot(Base):
    """Immutable report payload; rows are never updated after creation."""

    __tablename__ = "report_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    regulation_version_id = Column(String(100), nullable=False, index=True)
    plan_id = Column(String(36), nullable=True, index=True)
    payload = Column(JSON, nullable=False)
    data_cutoff = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(String(100), nullable=True)
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Free-text rationale for snapshot creation (who/why), kept out of the
    # immutable payload so the payload stays a pure state copy.
    rationale = Column(Text, nullable=True)
