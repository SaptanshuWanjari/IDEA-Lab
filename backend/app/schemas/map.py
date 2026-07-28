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
    owner_department_id: UUID
    description: str
    deadline: Optional[datetime] = None
    evidence_required: Optional[str] = None
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    source_clauses: List[str] = []
    status: str
    approval_state: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MAPReviewAction(BaseModel):
    action: str  # approve, edit, reject
    description: Optional[str] = None
    owner_department_id: Optional[UUID] = None
    deadline: Optional[datetime] = None
