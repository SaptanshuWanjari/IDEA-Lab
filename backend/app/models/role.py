import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey

from app.models.base import Base, new_uuid


class RoleCode(str, enum.Enum):
    BANK_ADMIN = "bank_admin"
    COMPLIANCE_MAKER = "compliance_maker"
    COMPLIANCE_APPROVER = "compliance_approver"
    DEPARTMENT_OWNER = "department_owner"
    EVIDENCE_APPROVER = "evidence_approver"
    RISK_APPROVER = "risk_approver"
    AUDITOR = "auditor"
    EXECUTIVE_VIEWER = "executive_viewer"


class RoleAssignment(Base):
    """Provisioned role grant scoped to a bank.

    bank_id is a plain String (no FK): the banks table lands in Task 3.
    """

    __tablename__ = "role_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    bank_id = Column(String(100), nullable=True, index=True)
    role_code = Column(String(50), nullable=False, index=True)
    granted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    effective_from = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    effective_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
