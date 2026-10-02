from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_request_scope, get_session
from app.models.user import User
from app.services.audit import AuditService
from app.services.authorization import AuthorizationError, Capability, RequestScope, authorize

router = APIRouter(prefix="/reports", tags=["reports"])


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
    return report
