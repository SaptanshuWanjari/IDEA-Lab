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
    summary = Column(Text, nullable=True)
    effective_date = Column(Date, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    created_by_user = relationship("User", back_populates="regulations")
    maps = relationship("MAP", back_populates="regulation", cascade="all, delete-orphan")
