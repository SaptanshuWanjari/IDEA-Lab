from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin, new_uuid


class DocumentArtifact(Base, TimestampMixin):
    """Quarantined file custody record with an opaque server-generated key."""

    __tablename__ = "document_artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    object_key = Column(Text, nullable=False, unique=True, index=True)
    display_name = Column(String(500), nullable=False)
    detected_mime = Column(String(200), nullable=True)
    sha256 = Column(String(64), nullable=False, index=True)
    state = Column(String(50), nullable=False, default="QUARANTINED", index=True)
    scan_result = Column(String(50), nullable=True)
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)
    classification = Column(String(100), nullable=True)
    retention_until = Column(String(50), nullable=True)
