from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_request_scope, get_session, require_role
from app.llm.client import LLMClient
from app.models.map import MAP
from app.models.user import User
from app.schemas.evidence import (
    AssessmentDraft,
    AssessmentOut,
    EvidenceApproveRequest,
    EvidenceAssessRequest,
)
from app.schemas.map import (
    MAPOut,
    MAPPlanApprove,
    MAPPlanCreate,
    MAPPlanOut,
    MAPReviewAction,
    MAPTransitionRequest,
    PlanDiffOut,
)
from app.services.audit import AuditService
from app.services.authorization import AuthorizationError, Capability, RequestScope, authorize
from app.services.document_pipeline import FileRejectedError
from app.services.evidence_assessment import approve_evidence, assess_evidence
from app.services.evidence_service import EvidenceService
from app.services.map_engine import MapEngine
from app.services.map_plan_service import approve_plan, create_candidate_plan, diff_plans
from app.services.storage import StorageService
from app.services.validation import ValidationService
from app.services.workflow import InvalidTransition, transition_map

router = APIRouter(prefix="/maps", tags=["maps"])


@router.post("/plans/candidate", response_model=MAPPlanOut)
async def create_plan_candidate(
    body: MAPPlanCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    """Generate a candidate DRAFT plan from APPROVED obligations only.

    Regeneration never mutates the active approved plan.
    """
    if not isinstance(scope, RequestScope):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No scope")
    try:
        plan = await create_candidate_plan(
            session,
            body.regulation_version_id,
            body.obligation_ids,
            scope,
            rationale=body.rationale,
            owner_department_id=body.owner_department_id,
            due_date_basis=body.due_date_basis,
        )
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return plan


@router.post("/plans/{plan_id}/approve", response_model=MAPPlanOut)
async def approve_candidate_plan(
    plan_id: str,
    body: MAPPlanApprove,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    """Approve a DRAFT plan; the prior active plan is superseded atomically."""
    if not isinstance(scope, RequestScope):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No scope")
    try:
        plan = await approve_plan(session, plan_id, scope, body.rationale)
    except AuthorizationError as e:
        if "maker-checker" in str(e):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return plan


@router.get("/plans/{plan_id}/diff", response_model=PlanDiffOut)
async def diff_plan_versions(
    plan_id: str,
    against: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    diff = await diff_plans(session, against, plan_id)
    return diff


@router.post("/evidence/{evidence_id}/assess", response_model=AssessmentDraft)
async def assess_map_evidence(
    evidence_id: str,
    body: EvidenceAssessRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    """Run an advisory content-backed assessment (never completes a MAP)."""
    if not isinstance(scope, RequestScope):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No scope")
    try:
        evidence, _ = await EvidenceService(session, StorageService()).get_with_assessment(evidence_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    try:
        authorize(scope, Capability.SUBMIT_EVIDENCE, evidence)
    except AuthorizationError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    try:
        draft = await assess_evidence(session, evidence_id, body.checklist, body.content_text)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return draft


@router.post("/evidence/{evidence_id}/approve", response_model=AssessmentOut)
async def approve_map_evidence(
    evidence_id: str,
    body: EvidenceApproveRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    """Record the binding approval decision; only APPROVED enables completion."""
    if not isinstance(scope, RequestScope):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No scope")
    try:
        assessment = await approve_evidence(
            session, evidence_id, body.decision, scope, body.rationale
        )
    except AuthorizationError as e:
        if "maker-checker" in str(e):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    except ValueError as e:
        msg = str(e)
        if "Evidence not found" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)
    return assessment


@router.post("/{map_id}/transition", response_model=MAPOut)
async def transition_map_state(
    map_id: UUID,
    body: MAPTransitionRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    """Formal workflow transition with scope, maker-checker and audit."""
    if not isinstance(scope, RequestScope):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No scope")
    try:
        m = await transition_map(session, str(map_id), body.target, scope, body.reason)
    except AuthorizationError as e:
        if "maker-checker" in str(e):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MAP not found")
    except InvalidTransition as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    return m


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
        evidence = await EvidenceService(session, storage).upload(
            str(map_id), str(user.id), file.filename, content, file.content_type
        )
    except FileRejectedError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    # Filename signals are advisory only: an upload never completes a MAP,
    # nor does it move the formal workflow state. Completion requires an
    # APPROVED EvidenceAssessment from a different approver via
    # POST /maps/evidence/{id}/approve + workflow transition.
    validation = ValidationService(session, LLMClient())
    completeness = await validation.check_completeness(str(map_id), file.filename)
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
        action="evidence_submitted",
        regulation_id=str(m.regulation_id),
        map_id=str(map_id),
        actor_id=str(user.id),
        payload={
            "evidence_id": str(evidence.id),
            "advisory_filename_match": completeness["complete"],
            "method": completeness.get("method"),
            "completion_requires": "APPROVED EvidenceAssessment from a different approver",
        },
    )
    await session.refresh(m)
    return {
        "map": MAPOut.model_validate(m),
        "evidence_id": str(evidence.id),
        "completeness_check": completeness,
        "functional_coverage": functional_coverage,
        "integrity_checks": integrity_checks,
        "completion_requires": "APPROVED EvidenceAssessment from a different approver",
    }
