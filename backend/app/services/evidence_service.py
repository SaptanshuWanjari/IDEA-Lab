from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import Evidence
from app.services.storage import StorageService


class EvidenceService:
    def __init__(self, session: AsyncSession, storage: StorageService):
        self.session = session
        self.storage = storage

    async def upload(self, map_id: str, user_id: str, filename: str, data: bytes) -> Evidence:
        object_name = f"{map_id}/{filename}"
        path = self.storage.upload("evidence", object_name, data, "application/octet-stream")
        evidence = Evidence(
            map_id=UUID(map_id),
            file_url=path,
            file_name=filename,
            uploaded_by=UUID(user_id),
        )
        self.session.add(evidence)
        await self.session.commit()
        await self.session.refresh(evidence)
        return evidence

    async def list_for_map(self, map_id: str) -> list[Evidence]:
        result = await self.session.execute(select(Evidence).where(Evidence.map_id == UUID(map_id)))
        return result.scalars().all()
