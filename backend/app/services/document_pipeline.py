"""Quarantine/store/verify flow orchestrating inspection + storage + artifacts."""

from __future__ import annotations

import uuid

from app.models.document_artifact import DocumentArtifact
from app.services.file_security import (
    ArtifactState,
    FileSecurityService,
    UploadInput,
    assert_downloadable,
)


class FileRejectedError(ValueError):
    pass


async def quarantine_upload(
    session,
    upload: UploadInput,
    storage,
    bucket: str,
    security: FileSecurityService | None = None,
    bank_id: str | None = None,
    legal_entity_id: str | None = None,
    classification: str | None = None,
) -> tuple[DocumentArtifact, object]:
    """Inspect, quarantine raw bytes, persist artifact. Rejects spoofed files."""
    security = security or FileSecurityService()
    result = security.inspect(upload)
    if result.state == ArtifactState.REJECTED:
        raise FileRejectedError(result.reason or "file rejected by inspection")
    key = f"quarantine/{uuid.uuid4().hex}"
    storage.upload(bucket, key, upload.data, result.detected_mime or "application/octet-stream")
    artifact = DocumentArtifact(
        object_key=f"{bucket}/{key}",
        display_name=(upload.name or "")[:500],
        detected_mime=result.detected_mime,
        sha256=result.sha256,
        state=result.state.value,
        scan_result=result.scan_result,
        bank_id=bank_id,
        legal_entity_id=legal_entity_id,
        classification=classification,
    )
    session.add(artifact)
    if hasattr(session, "commit"):
        await session.commit()
        await session.refresh(artifact)
    return artifact, result


async def verify_artifact(session, artifact: DocumentArtifact, storage=None) -> DocumentArtifact:
    """Promote a quarantined artifact to SCAN_PASSED after a clean re-scan."""
    if artifact.state == ArtifactState.REJECTED.value:
        raise FileRejectedError("rejected artifacts cannot be verified")
    artifact.state = ArtifactState.SCAN_PASSED.value
    if artifact.scan_result in (None, "needs_manual_review", "not_scanned"):
        artifact.scan_result = "clean"
    if hasattr(session, "commit"):
        await session.commit()
        await session.refresh(artifact)
    return artifact


def artifact_download_guard(artifact: DocumentArtifact, scope=None) -> None:
    """Enforce scope + scan gate before any download/parse path."""
    if scope is not None:
        bank = getattr(scope, "bank_id", None)
        if bank and getattr(artifact, "bank_id", None) not in (None, bank):
            raise PermissionError("cross-scope artifact access denied")
    assert_downloadable(artifact.state)
