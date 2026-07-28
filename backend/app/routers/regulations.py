from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_session
from app.models.regulation import Regulation
from app.models.user import User
from app.agents.graph import AgentGraph
from app.config import settings
from app.graph.client import GraphClient
from app.schemas.map import MAPOut
from app.schemas.regulation import RegulationOut
from app.services.document_classifier import classify_document
from app.services.embeddings import EmbeddingService
from app.services.graph_service import GraphService
from app.services.ingestion import IngestionService
from app.services.map_engine import MapEngine
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
    regulation = await service.create(content, file.filename, title, str(user.id))
    return regulation


@router.get("/{regulation_id}", response_model=RegulationOut)
async def get_regulation(
    regulation_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    regulation = await session.get(Regulation, regulation_id)
    if not regulation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regulation not found")
    return regulation


@router.get("/", response_model=list[RegulationOut])
async def list_regulations(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
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

    # Run 4-agent pipeline
    agent = AgentGraph()
    text = doc.clauses[0].text if doc.clauses else doc.raw_markdown[:4000]
    result = agent.run(str(regulation_id), text, [c.model_dump() for c in doc.clauses])

    # Save MAPs + dependencies
    engine = MapEngine(session)
    maps = await engine.save_draft(
        str(regulation_id),
        result.get("generated_maps", []),
        result.get("dependencies", []),
    )
    regulation.status = "Review"
    await session.commit()
    return [MAPOut.model_validate(m) for m in maps]
