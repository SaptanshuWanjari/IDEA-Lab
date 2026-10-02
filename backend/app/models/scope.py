"""Scope data model: Bank and LegalEntity.

Pilot is a single bank / single legal entity, but every protected record
carries bank_id + legal_entity_id so a second entity can be added without
a schema change.
"""

from sqlalchemy import Column, ForeignKey, String

from app.models.base import Base


class Bank(Base):
    __tablename__ = "banks"

    id = Column(String(100), primary_key=True)
    name = Column(String(200), nullable=False)


class LegalEntity(Base):
    __tablename__ = "legal_entities"

    id = Column(String(100), primary_key=True)
    name = Column(String(200), nullable=False)
    bank_id = Column(String(100), ForeignKey("banks.id"), nullable=False, index=True)
