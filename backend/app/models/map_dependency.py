from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, new_uuid


class MapDependency(Base):
    __tablename__ = "map_dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    map_id = Column(UUID(as_uuid=True), ForeignKey("maps.id"), nullable=False, index=True)
    depends_on_map_id = Column(UUID(as_uuid=True), ForeignKey("maps.id"), nullable=False)
