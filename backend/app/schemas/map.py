from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MAPCreate(BaseModel):
    description: str
    owner_department_id: UUID
    deadline: Optional[datetime] = None
    dependencies: List[UUID] = []
    evidence_required: Optional[str] = None
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    source_clauses: List[str] = []


class MAPOut(BaseModel):
    id: UUID
    regulation_id: UUID
    map_plan_id: Optional[str] = None
    owner_department_id: UUID
    description: str
    deadline: Optional[datetime] = None
    evidence_required: Optional[str] = None
    evidence_requirement_type: Optional[str] = None
    submitted_by: Optional[str] = None
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    source_clauses: List[str] = []
    estimated_days: Optional[int] = None
    status: str
    approval_state: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MAPReviewAction(BaseModel):
    action: str  # approve, edit, reject
    description: Optional[str] = None
    owner_department_id: Optional[UUID] = None
    deadline: Optional[datetime] = None


class MAPTransitionRequest(BaseModel):
    target: str  # PENDING | IN_PROGRESS | SUBMITTED | COMPLETED (or legacy values)
    reason: Optional[str] = None


class MAPPlanCreate(BaseModel):
    regulation_version_id: str
    obligation_ids: List[str]
    rationale: Optional[str] = None
    owner_department_id: Optional[str] = None
    due_date_basis: Optional[str] = None


class MAPPlanApprove(BaseModel):
    rationale: str


class MAPPlanItemOut(BaseModel):
    id: str
    plan_id: str
    obligation_id: str
    map_id: Optional[str] = None
    description: Optional[str] = None
    owner_department_id: Optional[str] = None
    due_date_basis: Optional[str] = None
    evidence_requirement: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MAPPlanOut(BaseModel):
    id: str
    regulation_version_id: str
    version_number: int
    status: str
    bank_id: Optional[str] = None
    legal_entity_id: Optional[str] = None
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    rationale: Optional[str] = None
    owner_department_id: Optional[str] = None
    due_date_basis: Optional[str] = None
    raci_responsible: Optional[str] = None
    raci_accountable: Optional[str] = None
    raci_consulted: Optional[str] = None
    raci_informed: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PlanDiffOut(BaseModel):
    previous_id: str
    candidate_id: str
    added: List[str] = []
    removed: List[str] = []
    unchanged: List[str] = []
