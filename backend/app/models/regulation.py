from sqlalchemy import Column, String, Text, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, new_uuid


class Regulation(Base, TimestampMixin):
    __tablename__ = "regulations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    title = Column(String(500), nullable=True)
    source_pdf_url = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="Draft")
    content_hash = Column(String(64), nullable=True, index=True)
    summary = Column(Text, nullable=True)
    effective_date = Column(Date, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # Scope columns: nullable for backfill compat (legacy rows backfilled to
    # Legacy Demo Bank/Entity at deploy, then tightened to non-null). New rows
    # must always set them.
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)

    created_by_user = relationship("User", back_populates="regulations")
    maps = relationship("MAP", back_populates="regulation", cascade="all, delete-orphan")
    versions = relationship(
        "RegulationVersion", back_populates="regulation", cascade="all, delete-orphan"
    )
