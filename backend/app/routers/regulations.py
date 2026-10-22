from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.dependencies import get_current_user, get_request_scope, get_session
from app.models.department import Department
from app.models.map import MAP
from app.models.map_dependency import MapDependency
from app.models.regulation import Regulation
from app.models.user import User
from app.services.authorization import AuthorizationError, Capability, RequestScope, authorize, scoped_select
from app.services.digital_twin import DigitalTwin
from app.agents.graph import AgentGraph
from app.config import settings
from app.graph.client import GraphClient
from app.schemas.map import MAPOut
from app.schemas.obligation import (
    ObligationCandidate,
    ObligationOut,
    ValidationResult,
)
from app.schemas.regulation import RegulationOut
from app.services.dependency_graph import DependencyGraph
from app.services.document_classifier import classify_document
from app.services.embeddings import EmbeddingService
from app.services.graph_service import GraphService
from app.services.ingestion import IngestionService
from app.services.map_engine import MapEngine
from app.services.document_pipeline import FileRejectedError
from app.services.job_service import JobService, create_reprocessing_version
from app.services.regulation_service import RegulationService
from app.services.storage import StorageService
from app.vector.client import HybridVectorStore

router = APIRouter(prefix="/regulations", tags=["regulations"])


@router.post("/", response_model=RegulationOut, status_code=status.HTTP_201_CREATED)
async def upload_regulation(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 20MB)")
    service = RegulationService(session, StorageService())
    try:
        regulation = await service.create(content, file.filename, title, str(user.id))
    except FileRejectedError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    return regulation


@router.get("/{regulation_id}", response_model=RegulationOut)
async def get_regulation(
    regulation_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")
    if isinstance(scope, RequestScope):
        try:
            authorize(scope, Capability.VIEW_REGULATION, regulation)
        except AuthorizationError:
            # Confidentiality: hide existence of out-of-scope objects.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")
    return regulation


@router.get("/", response_model=list[RegulationOut])
async def list_regulations(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    if isinstance(scope, RequestScope):
        result = await session.execute(scoped_select(Regulation, scope))
    else:
        result = await session.execute(select(Regulation))
    return result.scalars().all()


@router.post("/{regulation_id}/ingest")
async def ingest_regulation(
    regulation_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")

    storage = StorageService()
    bucket, key = regulation.source_pdf_url.split("/", 1)
    pdf_obj = storage.get_object(bucket, key)
    if pdf_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF not found in storage")
    pdf_bytes = pdf_obj.read()

    ingestion = IngestionService()
    doc = ingestion.extract(pdf_bytes)
    doc_class = classify_document(doc)

    regulation.title = doc.title or regulation.title
    regulation.summary = "\n".join(doc.sections[:3]) or doc.raw_markdown[:500]
    await session.commit()

    return {
        "status": "ingested",
        "document_class": doc_class,
        "clause_count": len(doc.clauses),
        "entity_count": len(doc.entities),
    }


@router.post("/{regulation_id}/reprocess", status_code=status.HTTP_202_ACCEPTED)
async def reprocess_regulation(
    regulation_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Enqueue asynchronous reprocessing; creates a NEW regulation version.

    Returns 202 Accepted with the idempotent job ID. Re-ingestion never
    overwrites prior versions. Existing sync endpoints are unchanged.
    """
    import json

    from app.models.job import JobKind

    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")

    content_hash = getattr(regulation, "content_hash", None) or "unknown"
    version = await create_reprocessing_version(session, regulation.id, content_hash)
    service = JobService(session)
    job = await service.enqueue_unique(
        JobKind.index_document, str(version.id), content_hash
    )
    return Response(
        status_code=status.HTTP_202_ACCEPTED,
        media_type="application/json",
        content=json.dumps(
            {
                "job_id": str(job.id),
                "regulation_version_id": str(version.id),
                "version_number": version.version_number,
                "status": "accepted",
            }
        ).encode(),
    )


@router.post("/{regulation_id}/generate", response_model=list[MAPOut])
async def generate_maps(
    regulation_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")

    # Download PDF from MinIO
    storage = StorageService()
    bucket, key = regulation.source_pdf_url.split("/", 1)
    pdf_obj = storage.get_object(bucket, key)
    if pdf_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF not found in storage")
    pdf_bytes = pdf_obj.read()

    # Document intelligence
    ingestion = IngestionService()
    doc = ingestion.extract(pdf_bytes)
    doc_class = classify_document(doc)

    # Graph ingestion
    graph_service = GraphService(GraphClient())
    graph_service.ingest_regulation(str(regulation_id), regulation.title or "Untitled", doc)

    # Vector ingestion
    vector_store = HybridVectorStore(settings.qdrant_url)
    EmbeddingService(vector_store).ingest(str(regulation_id), doc, doc_class)

    import traceback

    try:
        # Clear old Pending/Draft MAPs for this regulation to prevent duplicates on re-generation
        from app.models.map import Map, MapStatus
        from sqlalchemy import delete
        await session.execute(
            delete(Map).where(
                Map.regulation_id == regulation_id,
                Map.status.in_([MapStatus.PENDING, MapStatus.DRAFT])
            )
        )
        await session.commit()

        # Run 4-agent pipeline
        agent = AgentGraph()
        text = doc.raw_markdown[:8000]
        result = agent.run(str(regulation_id), text, [c.model_dump() for c in doc.clauses], doc_class)

        import logging
        _log = logging.getLogger(__name__)
        _log.debug("AGENT STATE: generated_maps=%d deps=%d, raw[0]=%s",
            len(result.get("generated_maps", [])),
            len(result.get("dependencies", [])),
            str(result.get("generated_maps", [])[:1])[:200])

        if not result.get("generated_maps"):
            raw_req = result.get("raw_req_response", "No req response found")
            raw_map = result.get("raw_llm_response", "No map response found")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent pipeline produced no MAPs (parse failed or LLM returned empty).\nRaw Req Output:\n{raw_req[:1000]}\n\nRaw Map Output:\n{raw_map[:1000]}",
            )

        # Save MAPs + dependencies
        engine = MapEngine(session)
        valid_clause_ids = [c.id for c in doc.clauses]
        maps = await engine.save_draft(
            str(regulation_id),
            result.get("generated_maps", []),
            result.get("dependencies", []),
            valid_clause_ids,
        )
        if not maps:
            raw_resp = result.get("raw_llm_response", "Not available")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No MAPs saved — all generated MAPs failed validation or were empty.\nRaw LLM response:\n{raw_resp[:2000]}",
            )
        regulation.status = "Review"
        await session.commit()
        return [MAPOut.model_validate(m) for m in maps]
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Internal pipeline error:\n{str(e)}\n\nTraceback:\n{tb}",
        )


@router.get("/{regulation_id}/graph")
async def get_regulation_graph(
    regulation_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")

    result = await session.execute(
        select(MAP).where(MAP.regulation_id == regulation_id).options(joinedload(MAP.department))
    )
    maps = result.scalars().unique().all()
    map_ids = [m.id for m in maps]

    deps_result = await session.execute(select(MapDependency).where(MapDependency.map_id.in_(map_ids)))
    dependencies = deps_result.scalars().all()

    graph = DependencyGraph(maps, dependencies)
    nodes = [
        {
            "id": str(m.id),
            "label": (m.description or "")[:60],
            "status": m.status,
            "department": m.department.name if m.department else None,
        }
        for m in maps
    ]
    return {
        "nodes": nodes,
        "edges": graph.edges(),
        "critical_path": [str(m) for m in graph.critical_path()],
        "topological_order": [str(m) for m in graph.topological_order()],
    }


@router.get("/{regulation_id}/simulate")
async def simulate_regulation(
    regulation_id: UUID,
    seed: int | None = None,
    input_snapshot_id: str | None = None,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")

    result = await session.execute(
        select(MAP, Department.name.label("department_name"))
        .outerjoin(Department, MAP.owner_department_id == Department.id)
        .where(MAP.regulation_id == regulation_id)
    )
    rows = result.all()
    maps = [row.MAP for row in rows]
    dept_names = {row.MAP.id: row.department_name for row in rows}

    dep_result = await session.execute(
        select(MapDependency).where(MapDependency.map_id.in_([m.id for m in maps]))
    )
    deps_by_map = {m.id: [] for m in maps}
    for dep in dep_result.scalars().all():
        deps_by_map[dep.map_id].append(str(dep.depends_on_map_id))

    map_data = [
        {
            "id": str(m.id),
            "department": dept_names.get(m.id) or str(m.owner_department_id),
            "status": m.status,
            "dependencies": deps_by_map.get(m.id, []),
            "optimistic_days": m.estimated_days or 3,
            "most_likely_days": m.estimated_days or 7,
            "pessimistic_days": (m.estimated_days or 7) * 2,
        }
        for m in maps
    ]

    twin = DigitalTwin(map_data, iterations=100)
    return twin.simulate(seed=seed, input_snapshot_id=input_snapshot_id)


# ---- Task 12: gold-set evaluation + scenario estimate pilot gates ----

class GoldItemBody(BaseModel):
    obligation_id: str
    obligation_text: str = ""
    quote: str = ""
    page: int | None = None
    deadline: str | None = None
    owner: str | None = None


class PredictionBody(BaseModel):
    obligation_id: str
    obligation_text: str = ""
    citation_valid: bool = False
    deadline: str | None = None
    owner: str | None = None
    edited_by_reviewer: bool = False


class EvaluateBody(BaseModel):
    predictions: list[PredictionBody] = []
    gold_set: list[GoldItemBody] = []
    protocol_version: str = "pilot-eval-v1"


class ScenarioEstimateBody(BaseModel):
    seed: int = 42
    input_snapshot_id: str | None = None
    history: list[dict] = []


@router.post("/evaluate")
async def evaluate_obligations_route(
    body: EvaluateBody,
    user: User = Depends(get_current_user),
):
    """Score predictions against a versioned gold set (read-only results).

    Only citation-valid predictions count as true positives. See
    docs/pilot-evaluation-protocol.md for the versioned protocol.
    """
    from dataclasses import asdict

    from app.services.evaluation import (
        GoldSetItem,
        PredictedObligation,
        evaluate_obligations,
    )

    report = evaluate_obligations(
        [PredictedObligation(**p.model_dump()) for p in body.predictions],
        [GoldSetItem(**g.model_dump()) for g in body.gold_set],
        protocol_version=body.protocol_version,
    )
    return asdict(report)


@router.post("/{regulation_id}/scenario-estimate")
async def scenario_estimate_regulation(
    regulation_id: UUID,
    body: ScenarioEstimateBody,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Implementation Scenario Estimate with calibration gate.

    Returns calibrated=false with data-quality notes until the historical
    backtest threshold is met. Never labelled a forecast.
    """
    from dataclasses import asdict

    from app.services.scenario_estimator import ScenarioEstimator

    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")

    result = await session.execute(
        select(MAP, Department.name.label("department_name"))
        .outerjoin(Department, MAP.owner_department_id == Department.id)
        .where(MAP.regulation_id == regulation_id)
    )
    rows = result.all()
    maps = [row.MAP for row in rows]
    dept_names = {row.MAP.id: row.department_name for row in rows}

    dep_result = await session.execute(
        select(MapDependency).where(MapDependency.map_id.in_([m.id for m in maps]))
    )
    deps_by_map = {m.id: [] for m in maps}
    for dep in dep_result.scalars().all():
        deps_by_map[dep.map_id].append(str(dep.depends_on_map_id))

    map_data = [
        {
            "id": str(m.id),
            "department": dept_names.get(m.id) or str(m.owner_department_id),
            "status": m.status,
            "dependencies": deps_by_map.get(m.id, []),
            "optimistic_days": m.estimated_days or 3,
            "most_likely_days": m.estimated_days or 7,
            "pessimistic_days": (m.estimated_days or 7) * 2,
        }
        for m in maps
    ]
    estimate = ScenarioEstimator(map_data, history=body.history).run(
        seed=body.seed, input_snapshot_id=body.input_snapshot_id
    )
    return asdict(estimate)


# ---- Task 7: cited obligation ledger review endpoints ----

from pydantic import BaseModel  # noqa: E402


class CandidateReviewBody(BaseModel):
    candidate: ObligationCandidate
    pages: dict[int, str] = {}
    clauses: dict[str, dict] = {}
    regulation_version_id: str | None = None
    created_by: str | None = None


class ObligationReviewBody(BaseModel):
    decision: str  # "approve" | "reject"
    reviewer_id: str
    rationale: str | None = None
    pages: dict[int, str] = {}
    clauses: dict[str, dict] = {}


class RegulationPlanCandidateBody(BaseModel):
    regulation_version_id: str | None = None
    obligation_ids: list[str]
    rationale: str | None = None
    owner_department_id: str | None = None
    due_date_basis: str | None = None


@router.post("/{regulation_id}/plans/candidate")
async def create_regulation_plan_candidate(
    regulation_id: UUID,
    body: RegulationPlanCandidateBody,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    scope: RequestScope | None = Depends(get_request_scope),
):
    """Regulation-scoped alias for candidate-plan generation.

    Builds a DRAFT plan only from APPROVED obligations; never mutates
    the active approved plan.
    """
    from app.services.authorization import AuthorizationError as _AuthError
    from app.services.map_plan_service import create_candidate_plan as _create_candidate

    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")
    if not isinstance(scope, RequestScope):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No scope")
    try:
        plan = await _create_candidate(
            session,
            body.regulation_version_id or str(regulation_id),
            body.obligation_ids,
            scope,
            rationale=body.rationale,
            owner_department_id=body.owner_department_id,
            due_date_basis=body.due_date_basis,
        )
    except _AuthError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
    return {
        "plan_id": str(plan.id),
        "regulation_version_id": plan.regulation_version_id,
        "version_number": plan.version_number,
        "status": plan.status,
    }


@router.post("/{regulation_id}/obligations/candidates")
async def create_obligation_candidate(
    regulation_id: UUID,
    body: CandidateReviewBody,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Validate an extracted candidate against the canonical document and
    persist it as DRAFT (valid citation) or REVIEWED-with-rationale
    (invalid citation — a review error, never an approved obligation)."""
    from app.models.obligation import Obligation
    from app.services.citation_validator import CanonicalDocument
    from app.services.obligation_service import create_candidate, validate_and_review

    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")
    document = CanonicalDocument(
        source_version_id=body.regulation_version_id or str(regulation_id),
        pages={int(k): str(v) for k, v in (body.pages or {}).items()},
        clauses=dict(body.clauses or {}),
    )
    validation = validate_and_review(body.candidate, document)
    obligation = create_candidate(
        body.candidate, document,
        regulation_version_id=body.regulation_version_id or str(regulation_id),
        created_by=body.created_by or str(user.id),
    )
    session.add(obligation)
    await session.commit()
    await session.refresh(obligation)
    return {
        "obligation": ObligationOut.model_validate(obligation),
        "validation": validation.model_dump(),
    }


@router.get("/{regulation_id}/obligations", response_model=list[ObligationOut])
async def list_obligations(
    regulation_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """List ledger obligations across all versions of this regulation."""
    from app.models.obligation import Obligation
    from app.models.regulation_version import RegulationVersion

    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")
    result = await session.execute(
        select(RegulationVersion.id).where(RegulationVersion.regulation_id == regulation_id)
    )
    version_ids = [str(v) for v in result.scalars().all()] + [str(regulation_id)]
    result = await session.execute(
        select(Obligation).where(Obligation.regulation_version_id.in_(version_ids))
    )
    return [ObligationOut.model_validate(o) for o in result.scalars().all()]


@router.post("/{regulation_id}/obligations/{obligation_id}/review")
async def review_obligation(
    regulation_id: UUID,
    obligation_id: str,
    body: ObligationReviewBody,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Reviewer decision on a ledger obligation. Approval requires a valid
    citation (re-validated server-side) plus a reviewer different from the
    creator; violations return 422/403, never an approved row."""
    from app.models.obligation import Obligation
    from app.services.citation_validator import CanonicalDocument
    from app.services.obligation_service import (
        CitationError,
        MakerCheckerError,
        approve_obligation,
        reject_obligation,
        validate_and_review,
    )

    obligation = await session.get(Obligation, obligation_id)
    if not obligation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation not found")
    if body.decision == "reject":
        if not body.rationale:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="rejection requires a rationale",
            )
        reject_obligation(obligation, reviewer_id=body.reviewer_id, rationale=body.rationale)
        await session.commit()
        return {"obligation": ObligationOut.model_validate(obligation)}
    if body.decision != "approve":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="decision must be approve or reject")
    document = CanonicalDocument(
        source_version_id=obligation.regulation_version_id,
        pages={int(k): str(v) for k, v in (body.pages or {}).items()},
        clauses=dict(body.clauses or {}),
    )
    candidate = ObligationCandidate(
        clause_id=obligation.clause_id, quote=obligation.quote, page=obligation.page,
        obligation_text=obligation.obligation_text,
    )
    validation = validate_and_review(candidate, document)
    try:
        approve_obligation(
            obligation, reviewer_id=body.reviewer_id,
            validation=validation, rationale=body.rationale,
        )
    except MakerCheckerError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
    except CitationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e
    await session.commit()
    return {
        "obligation": ObligationOut.model_validate(obligation),
        "validation": validation.model_dump(),
    }
