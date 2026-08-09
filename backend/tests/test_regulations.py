from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest

from app.models.regulation import Regulation
from app.services.regulation_service import RegulationService


class FakeStorage:
    def upload(self, bucket, object_name, data, content_type):
        return f"{bucket}/{object_name}"


class FakeSession:
    def __init__(self):
        self.duplicate = False
        self.added = []

    async def execute(self, stmt):
        class R:
            def scalar_one_or_none(_self):
                return Regulation() if self.duplicate else None
        return R()

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


@pytest.mark.asyncio
async def test_upload_same_pdf_rejected():
    session = FakeSession()
    service = RegulationService(session, FakeStorage())
    pdf = b"same pdf bytes"
    user_id = "cdf0cb9b-3b74-44d5-9df7-fa75137467b5"
    await service.create(pdf, "a.pdf", "t", user_id)
    session.duplicate = True
    with pytest.raises(ValueError, match="already been uploaded"):
        await service.create(pdf, "a.pdf", "t", user_id)


@pytest.mark.asyncio
async def test_generate_maps_returns_400_on_cycle():
    from fastapi import HTTPException

    from app.routers.regulations import generate_maps

    regulation = Regulation(id=uuid4(), source_pdf_url="bucket/key", title="t")
    session = AsyncMock()
    session.get = AsyncMock(return_value=regulation)
    session.commit = AsyncMock()

    user = MagicMock()
    user.id = uuid4()

    with (
        patch("app.routers.regulations.StorageService") as MockStorage,
        patch("app.routers.regulations.IngestionService") as MockIngestion,
        patch("app.routers.regulations.GraphService") as MockGraph,
        patch("app.routers.regulations.EmbeddingService") as MockEmbedding,
        patch("app.routers.regulations.AgentGraph") as MockAgent,
        patch("app.routers.regulations.MapEngine") as MockEngine,
    ):
        MockStorage.return_value.get_object.return_value.read.return_value = b"pdf"
        doc = MagicMock()
        doc.raw_markdown = "text"
        doc.clauses = []
        MockIngestion.return_value.extract.return_value = doc
        MockAgent.return_value.run.return_value = {"generated_maps": [], "dependencies": []}
        MockEngine.return_value.save_draft.side_effect = ValueError("Cycle detected in MAP dependencies")

        with pytest.raises(HTTPException) as exc_info:
            await generate_maps(regulation.id, session, user)

        assert exc_info.value.status_code == 400
