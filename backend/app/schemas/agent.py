from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class Requirement(BaseModel):
    clause_id: str
    obligation: str
    deadline_days: Optional[int] = None
    threshold: Optional[str] = None
    entity: Optional[str] = None
    confidence: float


DepartmentName = Literal["Compliance", "Risk", "IT", "Operations", "Audit"]


class GeneratedMAP(BaseModel):
    description: str
    owner_department: DepartmentName
    deadline_days: Optional[int] = None
    evidence_required: Optional[str] = None
    depends_on: List[str] = Field(default_factory=list)
    confidence: float
    reasoning: str
    source_clauses: List[str]
    retrieved_context: Optional[str] = None

    @field_validator("owner_department", mode="before")
    @classmethod
    def _normalize_department(cls, v: Any) -> str:
        if not isinstance(v, str):
            return v
        canonical = {
            "compliance": "Compliance",
            "risk": "Risk",
            "it": "IT",
            "operations": "Operations",
            "audit": "Audit",
        }
        return canonical.get(v.lower(), v)


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
