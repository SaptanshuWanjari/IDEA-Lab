"""Task 7: obligation candidate/result schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field


class ObligationCandidate(BaseModel):
    clause_id: str
    quote: str
    page: Optional[int] = None
    obligation_text: str = ""
    deadline_kind: Optional[str] = None
    deadline_value: Optional[int] = None
    deadline_unit: Optional[str] = None
    deadline_anchor: Optional[str] = None
    owner_hint: Optional[str] = None
    bank_id: Optional[str] = None
    legal_entity_id: Optional[str] = None


class ValidationResult(BaseModel):
    accepted: bool
    reasons: List[str] = Field(default_factory=list)


class ObligationOut(BaseModel):
    id: str
    regulation_version_id: str
    clause_id: str
    quote: str
    page: Optional[int] = None
    obligation_text: str = ""
    deadline_kind: Optional[str] = None
    deadline_value: Optional[int] = None
    deadline_unit: Optional[str] = None
    deadline_anchor: Optional[str] = None
    owner_hint: Optional[str] = None
    status: str
    reviewer_rationale: Optional[str] = None

    model_config = {"from_attributes": True}
