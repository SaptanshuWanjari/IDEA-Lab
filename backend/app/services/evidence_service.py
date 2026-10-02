from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import Evidence
from app.services.document_pipeline import FileRejectedError
from app.services.file_security import MIME_TO_EXT, FileSecurityService, UploadInput
from app.services.storage import StorageService, opaque_object_key


class EvidenceService:
    def __init__(self, session: AsyncSession, storage: StorageService):
        self.session = session
        self.storage = storage

    async def upload(
        self, map_id: str, user_id: str, filename: str, data: bytes, declared_mime: str | None = None
    ) -> Evidence:
        inspection = FileSecurityService().inspect(
            UploadInput(
                name=filename,
                declared_mime=declared_mime or "application/octet-stream",
                data=data,
            )
        )
        if inspection.state.value == "REJECTED":
            raise FileRejectedError(inspection.reason or "evidence file rejected by inspection")
        ext = MIME_TO_EXT.get(inspection.detected_mime or "", "")
        object_name = opaque_object_key(str(map_id), ext)
        path = self.storage.upload(
            "evidence", object_name, data, inspection.detected_mime or "application/octet-stream"
        )
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
