from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
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
from app.schemas.regulation import RegulationOut
from app.services.dependency_graph import DependencyGraph
from app.services.document_classifier import classify_document
from app.services.embeddings import EmbeddingService
from app.services.graph_service import GraphService
from app.services.ingestion import IngestionService
from app.services.map_engine import MapEngine
from app.services.document_pipeline import FileRejectedError
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
    return twin.simulate()
