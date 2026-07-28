from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_session, require_role
from app.llm.client import LLMClient
from app.models.map import MAP
from app.models.user import User
from app.schemas.map import MAPOut, MAPReviewAction
from app.services.evidence_service import EvidenceService
from app.services.map_engine import MapEngine
from app.services.storage import StorageService
from app.services.validation import ValidationService

router = APIRouter(prefix="/maps", tags=["maps"])


@router.get("/", response_model=list[MAPOut])
async def list_maps(
    regulation_id: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = select(MAP)
    if regulation_id:
        stmt = stmt.where(MAP.regulation_id == regulation_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{map_id}", response_model=MAPOut)
async def get_map(
    map_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    m = await session.get(MAP, map_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")
    return m


@router.post("/{map_id}/review", response_model=MAPOut)
async def review_map(
    map_id: UUID,
    action: MAPReviewAction,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role("compliance_officer", "admin")),
):
    engine = MapEngine(session)
    m = await session.get(MAP, map_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")

    if action.action == "approve":
        m = await engine.approve(str(map_id))
    elif action.action == "reject":
        m.approval_state = "Rejected"
    elif action.action == "edit":
        if action.description:
            m.description = action.description
        if action.owner_department_id:
            m.owner_department_id = action.owner_department_id
        if action.deadline:
            m.deadline = action.deadline
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action")

    await session.commit()
    await session.refresh(m)
    return m


@router.post("/{map_id}/complete")
async def complete_map(
    map_id: UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    m = await session.get(MAP, map_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")

    allowed = {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    if file.content_type not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 20MB)")

    storage = StorageService()
    await EvidenceService(session, storage).upload(str(map_id), str(user.id), file.filename, content)

    validation = ValidationService(session, LLMClient())
    completeness = await validation.check_completeness(str(map_id), file.filename)
    m.status = "Completed" if completeness["complete"] else "InProgress"

    await session.commit()
    await session.refresh(m)
    return {"map": MAPOut.model_validate(m), "completeness_check": completeness}
