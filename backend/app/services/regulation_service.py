import hashlib
import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.regulation import Regulation
from app.services.document_pipeline import FileRejectedError
from app.services.file_security import FileSecurityService, UploadInput
from app.services.storage import StorageService, opaque_object_key


class RegulationService:
    def __init__(self, session: AsyncSession, storage: StorageService):
        self.session = session
        self.storage = storage

    async def create(
        self, file_bytes: bytes, filename: str, title: str | None, user_id: str, scope=None
    ) -> Regulation:
        inspection = FileSecurityService().inspect(
            UploadInput(name=filename, declared_mime="application/pdf", data=file_bytes)
        )
        if inspection.state.value == "REJECTED":
            raise FileRejectedError(inspection.reason or "regulation file rejected by inspection")
        content_hash = hashlib.sha256(file_bytes).hexdigest()
        result = await self.session.execute(select(Regulation).where(Regulation.content_hash == content_hash))
        if result.scalar_one_or_none():
            raise ValueError("This PDF has already been uploaded")

        regulation_id = str(uuid.uuid4())
        object_name = opaque_object_key(regulation_id, ".pdf")
        path = self.storage.upload("regulations", object_name, file_bytes, "application/pdf")
        # New rows must carry scope; fall back to the legacy single-bank
        # scope when no scope is supplied (dev/backfill compat).
        from app.services.authorization import LEGACY_BANK_ID, LEGACY_ENTITY_ID

        regulation = Regulation(
            id=uuid.UUID(regulation_id),
            title=title,
            source_pdf_url=path,
            status="Draft",
            content_hash=content_hash,
            created_by=uuid.UUID(user_id),
            bank_id=getattr(scope, "bank_id", None) or LEGACY_BANK_ID,
            legal_entity_id=(getattr(scope, "legal_entity_ids", None) or [LEGACY_ENTITY_ID])[0],
        )
        self.session.add(regulation)
        await self.session.commit()
        await self.session.refresh(regulation)
        return regulation

    async def get_scoped(self, regulation_id: str, scope) -> Regulation:
        """Fetch one regulation enforcing the request scope (404-style).

        Demonstrates the going-forward pattern: service methods accept
        ``scope`` rather than a bare ``user_id``.
        """
        from app.services.authorization import Capability, authorize

        regulation = await self.session.get(Regulation, UUID(regulation_id))
        if regulation is None:
            raise ValueError("Regulation not found")
        authorize(scope, Capability.VIEW_REGULATION, regulation)
        return regulation
