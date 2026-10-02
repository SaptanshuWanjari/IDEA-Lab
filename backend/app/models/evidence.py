from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, new_uuid


class Evidence(Base, TimestampMixin):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    map_id = Column(UUID(as_uuid=True), ForeignKey("maps.id"), nullable=False, index=True)
    file_url = Column(Text, nullable=False)
    file_name = Column(String(500), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    bank_id = Column(String(100), nullable=True, index=True)
    legal_entity_id = Column(String(100), nullable=True, index=True)

    map = relationship("MAP", back_populates="evidence")
