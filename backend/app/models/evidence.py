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
    # Verified content extracted from the stored artifact. Content-backed
    # review reads this — never the filename.
    content_text = Column(Text, nullable=True)
    content_checksum = Column(String(128), nullable=True)
    source_system = Column(String(100), nullable=True)
    evidence_period = Column(String(100), nullable=True)
    # Latest binding assessment decision (APPROVED/REJECTED/NEEDS_REVIEW);
    # NULL means attached but not yet decided.
    assessment_decision = Column(String(20), nullable=True, index=True)

    map = relationship("MAP", back_populates="evidence")

    @property
    def submitter_id(self) -> str:
        """Uploader acting as the maker in maker-checker review."""
        return str(self.uploaded_by)
