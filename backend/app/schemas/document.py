from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class Clause(BaseModel):
    id: str
    text: str
    section: Optional[str] = None
    subsection: Optional[str] = None
    page: Optional[int] = None


class Entity(BaseModel):
    name: str
    type: Literal["department", "date", "threshold", "regulation_ref", "term"]


class TableInfo(BaseModel):
    caption: Optional[str] = None
    headers: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)
    page: int = 1


class DocumentStructure(BaseModel):
    title: Optional[str] = None
    sections: List[str] = Field(default_factory=list)
    clauses: List[Clause] = Field(default_factory=list)
    tables: List[TableInfo] = Field(default_factory=list)
    entities: List[Entity] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)
    raw_markdown: Optional[str] = None


class DocumentClass:
    RBI_CIRCULAR = "RBI Circular"
    REGULATION = "Regulation"
    POLICY = "Policy"
    SOP = "SOP"
    EVIDENCE = "Evidence"
