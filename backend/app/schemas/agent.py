from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Requirement(BaseModel):
    clause_id: str
    obligation: str
    deadline_days: Optional[int] = None
    threshold: Optional[str] = None
    entity: Optional[str] = None
    confidence: float


class GeneratedMAP(BaseModel):
    description: str
    owner_department: str
    deadline_days: Optional[int] = None
    evidence_required: Optional[str] = None
    depends_on: List[str] = Field(default_factory=list)
    confidence: float
    reasoning: str
    source_clauses: List[str]
    retrieved_context: Optional[str] = None


class AgentState(BaseModel):
    regulation_id: str
    text: str = ""
    clauses: list = Field(default_factory=list)
    summary: str = ""
    affected_domains: list[str] = Field(default_factory=list)
    requirements: list = Field(default_factory=list)
    generated_maps: list = Field(default_factory=list)
    dependencies: list = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
