from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_request_scope, get_session
from app.models.user import User
from app.services.audit import AuditService
from app.services.authorization import AuthorizationError, Capability, RequestScope, authorize
from app.services.report_snapshot import build_report_snapshot, get_snapshot

router = APIRouter(prefix="/reports", tags=["reports"])


class SnapshotRequest(BaseModel):
    regulation_version_id: str
    plan_id: str
    rationale: Optional[str] = None
    correlation_id: Optional[str] = None
    evaluation: Optional[dict] = None


@router.post("/snapshots", status_code=status.HTTP_201_CREATED)
async def create_snapshot(
    body: SnapshotRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    """Freeze the current versioned state into an immutable report snapshot."""
    try:
        snapshot = await build_report_snapshot(
            session,
            body.regulation_version_id,
            body.plan_id,
            scope=scope if isinstance(scope, RequestScope) else None,
            created_by=str(user.id),
            correlation_id=body.correlation_id,
            rationale=body.rationale,
            evaluation=body.evaluation,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    return {
        "id": str(snapshot.id),
        "regulation_version_id": snapshot.regulation_version_id,
        "plan_id": snapshot.plan_id,
        "data_cutoff": snapshot.data_cutoff.isoformat() if snapshot.data_cutoff else None,
        "created_by": snapshot.created_by,
        "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
        "payload": snapshot.payload,
    }


@router.get("/snapshots/{snapshot_id}")
async def fetch_snapshot(
    snapshot_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    snapshot = await get_snapshot(session, snapshot_id)
    if snapshot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snapshot not found")
    return {
        "id": str(snapshot.id),
        "regulation_version_id": snapshot.regulation_version_id,
        "plan_id": snapshot.plan_id,
        "data_cutoff": snapshot.data_cutoff.isoformat() if snapshot.data_cutoff else None,
        "created_by": snapshot.created_by,
        "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
        "payload": snapshot.payload,
    }


@router.get("/{regulation_id}/report")
async def get_report(
    regulation_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    audit = AuditService(session)
    try:
        report = await audit.build_report(str(regulation_id), scope=scope if isinstance(scope, RequestScope) else None)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except AuthorizationError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")
    await audit.log(
        action="report_generated",
        regulation_id=str(regulation_id),
        actor_id=str(user.id),
        payload={"generated_at": report["generated_at"]},
    )
    report["evaluation_protocol"] = "pilot-eval-v1 (see docs/pilot-evaluation-protocol.md)"
    report["evaluation"] = None
    return report
