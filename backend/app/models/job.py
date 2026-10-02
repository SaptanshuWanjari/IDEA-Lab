"""Task 5: idempotent background job records.

DB-level idempotency is enforced by the unique ``idempotency_key``
(``kind:source_version_id:content_hash``). Live Redis/Dramatiq execution is
optional; the service layer works without a broker.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from app.models.base import Base


def _utcnow():
    return datetime.now(timezone.utc)


class JobKind:
    scan_document = "scan_document"
    extract_document = "extract_document"
    index_document = "index_document"
    draft_obligations = "draft_obligations"
    draft_map_plan = "draft_map_plan"

    # Allow ``JobKind.index_document`` attribute access used by tests while
    # remaining a plain string value.
    def __new__(cls, *args, **kwargs):  # pragma: no cover - defensive
        raise TypeError("JobKind is a namespace, not to be instantiated")


# Expose kind values as attributes on the class object itself is automatic
# (class attributes above). Provide a ``value``-compatible helper for the
# service: plain strings are used throughout.
JobKindValues = (
    JobKind.scan_document,
    JobKind.extract_document,
    JobKind.index_document,
    JobKind.draft_obligations,
    JobKind.draft_map_plan,
)


class JobStatus:
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    NEEDS_MANUAL_REVIEW = "NEEDS_MANUAL_REVIEW"


ACTIVE_STATUSES = (JobStatus.PENDING, JobStatus.RUNNING)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    kind = Column(String(100), nullable=False, index=True)
    source_version_id = Column(String(100), nullable=True, index=True)
    idempotency_key = Column(String(300), nullable=False, unique=True, index=True)
    content_hash = Column(String(128), nullable=True)
    status = Column(String(50), nullable=False, default=JobStatus.PENDING, index=True)
    retry_count = Column(Integer, nullable=False, default=0)
    model_version = Column(String(100), nullable=True)
    prompt_version = Column(String(100), nullable=True)
    error_category = Column(String(100), nullable=True)
    correlation_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
