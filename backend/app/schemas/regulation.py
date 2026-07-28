from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RegulationCreate(BaseModel):
    title: Optional[str] = None


class RegulationOut(BaseModel):
    id: UUID
    title: Optional[str] = None
    source_pdf_url: str
    status: str
    summary: Optional[str] = None
    effective_date: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
