from hashlib import sha256
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
        self,
        map_id: str,
        user_id: str,
        filename: str,
        data: bytes,
        declared_mime: str | None = None,
        content_text: str | None = None,
        source_system: str | None = None,
        evidence_period: str | None = None,
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
            content_text=content_text,
            content_checksum=sha256(data).hexdigest(),
            source_system=source_system,
            evidence_period=evidence_period,
        )
        self.session.add(evidence)
        await self.session.commit()
        await self.session.refresh(evidence)
        return evidence

    async def list_for_map(self, map_id: str) -> list[Evidence]:
        result = await self.session.execute(select(Evidence).where(Evidence.map_id == UUID(map_id)))
        return result.scalars().all()

    @staticmethod
    def submitter(evidence: Evidence) -> str:
        """Expose the maker (uploader) for maker-checker enforcement."""
        return str(evidence.uploaded_by)

    async def get_with_assessment(self, evidence_id: str):
        """Return ``(evidence, latest_assessment_or_None)`` for review UIs."""
        from app.services.evidence_assessment import latest_assessments_for_evidence

        evidence = await self.session.get(Evidence, evidence_id)
        if evidence is None:
            raise ValueError(f"Evidence not found: {evidence_id}")
        latest = await latest_assessments_for_evidence(self.session, [evidence.id])
        assessment = latest.get(str(evidence.id))
        if assessment is None:
            for key, value in latest.items():
                if str(key) == str(evidence.id):
                    assessment = value
                    break
        return evidence, assessment
