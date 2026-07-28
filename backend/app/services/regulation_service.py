import uuid
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.regulation import Regulation
from app.services.storage import StorageService


class RegulationService:
    def __init__(self, session: AsyncSession, storage: StorageService):
        self.session = session
        self.storage = storage

    async def create(self, file_bytes: bytes, filename: str, title: str | None, user_id: str) -> Regulation:
        regulation_id = str(uuid.uuid4())
        object_name = f"{regulation_id}/{filename}"
        path = self.storage.upload("regulations", object_name, file_bytes, "application/pdf")
        regulation = Regulation(
            id=uuid.UUID(regulation_id),
            title=title,
            source_pdf_url=path,
            status="Draft",
            created_by=uuid.UUID(user_id),
        )
        self.session.add(regulation)
        await self.session.commit()
        await self.session.refresh(regulation)
        return regulation
