from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EvidenceDecision(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REQUEST_INFO = "REQUEST_INFO"


class ChecklistItem(BaseModel):
    key: str
    description: str = ""
    required: bool = True


class EvidenceChecklist(BaseModel):
    items: list[ChecklistItem]


class ChecklistItemResult(BaseModel):
    key: str
    passed: bool
    required: bool = True
    support: Optional[str] = None
    missing_terms: list[str] = []


class AssessmentDraft(BaseModel):
    """Advisory content comparison; never sufficient for MAP completion."""

    evidence_id: str
    decision: EvidenceDecision
    checklist_results: dict[str, ChecklistItemResult]
    missing_elements: list[str] = []
    advisory_only: bool = True
    note: Optional[str] = None


class AssessmentOut(BaseModel):
    id: UUID
    evidence_id: UUID
    map_id: Optional[UUID] = None
    decision: str
    assessor_id: Optional[str] = None
    submitter_id: Optional[str] = None
    rationale: Optional[str] = None
    bank_id: Optional[str] = None
    legal_entity_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvidenceAssessRequest(BaseModel):
    checklist: EvidenceChecklist
    content_text: Optional[str] = None


class EvidenceApproveRequest(BaseModel):
    decision: EvidenceDecision
    rationale: Optional[str] = None
