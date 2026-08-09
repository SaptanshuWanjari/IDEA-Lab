from sqlalchemy import Column, String, Text, Float, Integer, DateTime, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, new_uuid


class MAP(Base, TimestampMixin):
    __tablename__ = "maps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    regulation_id = Column(UUID(as_uuid=True), ForeignKey("regulations.id"), nullable=False, index=True)
    owner_department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False)
    description = Column(Text, nullable=False)
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default="Pending")
    approval_state = Column(String(50), nullable=False, default="Draft")
    confidence = Column(Float, nullable=True)
    reasoning = Column(Text, nullable=True)
    source_clauses = Column(ARRAY(String), nullable=True)
    evidence_required = Column(Text, nullable=True)
    estimated_days = Column(Integer, nullable=True, default=7)

    regulation = relationship("Regulation", back_populates="maps")
    department = relationship("Department", back_populates="maps")
    evidence = relationship("Evidence", back_populates="map", cascade="all, delete-orphan")
