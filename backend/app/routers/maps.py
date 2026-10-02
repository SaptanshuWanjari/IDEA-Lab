from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_request_scope, get_session, require_role
from app.llm.client import LLMClient
from app.models.map import MAP
from app.models.user import User
from app.schemas.map import MAPOut, MAPReviewAction
from app.services.audit import AuditService
from app.services.authorization import AuthorizationError, Capability, RequestScope, authorize
from app.services.document_pipeline import FileRejectedError
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
    scope: RequestScope | None = Depends(get_request_scope),
):
    m = await session.get(MAP, map_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")
    if isinstance(scope, RequestScope):
        try:
            authorize(scope, Capability.VIEW_REGULATION, m)
        except AuthorizationError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")
    return m


@router.post("/{map_id}/review", response_model=MAPOut)
async def review_map(
    map_id: UUID,
    action: MAPReviewAction,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role("compliance_officer", "admin")),
    scope: RequestScope | None = Depends(get_request_scope),
):
    engine = MapEngine(session)
    m = await session.get(MAP, map_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")

    if isinstance(scope, RequestScope):
        try:
            authorize(scope, Capability.APPROVE_MAP, m)
        except AuthorizationError as e:
            if "maker-checker" in str(e):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")

    if action.action == "approve":
        m = await engine.approve(str(map_id))
    elif action.action == "reject":
        m.approval_state = "Rejected"
        m.status = "Rejected"
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
    audit = AuditService(session)
    await audit.log(
        action=f"review_{action.action}",
        regulation_id=str(m.regulation_id),
        map_id=str(map_id),
        actor_id=str(user.id),
        payload={"approval_state": m.approval_state},
    )
    await session.refresh(m)
    return m


@router.post("/{map_id}/complete")
async def complete_map(
    map_id: UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    m = await session.get(MAP, map_id)
    if not m:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")
    if isinstance(scope, RequestScope):
        try:
            authorize(scope, Capability.SUBMIT_EVIDENCE, m)
        except AuthorizationError:
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
    try:
        await EvidenceService(session, storage).upload(
            str(map_id), str(user.id), file.filename, content, file.content_type
        )
    except FileRejectedError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    validation = ValidationService(session, LLMClient())
    completeness = await validation.check_completeness(str(map_id), file.filename)
    m.status = "Completed" if completeness["complete"] else "InProgress"
    await session.flush()

    functional_coverage = await validation.functional_coverage(str(m.regulation_id))
    integrity_issues = await validation.integrity_check(str(m.regulation_id))
    integrity_checks = {
        "file_type_valid": file.content_type in allowed,
        "size_within_limit": len(content) <= 20 * 1024 * 1024,
        "issues": integrity_issues,
    }

    await session.commit()
    audit = AuditService(session)
    await audit.log(
        action="map_completed",
        regulation_id=str(m.regulation_id),
        map_id=str(map_id),
        actor_id=str(user.id),
        payload={"complete": completeness["complete"], "method": completeness.get("method")},
    )
    await session.refresh(m)
    return {
        "map": MAPOut.model_validate(m),
        "completeness_check": completeness,
        "functional_coverage": functional_coverage,
        "integrity_checks": integrity_checks,
    }
