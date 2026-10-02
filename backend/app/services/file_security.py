"""Quarantined file custody: type inspection, opaque keys, scan adapter."""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from enum import Enum


class ArtifactState(str, Enum):
    QUARANTINED = "QUARANTINED"
    SCAN_PASSED = "SCAN_PASSED"
    VERIFIED = "SCAN_PASSED"  # legacy alias for SCAN_PASSED
    REJECTED = "REJECTED"


DOWNLOADABLE_STATES = {ArtifactState.SCAN_PASSED.value}

MAX_UPLOAD_BYTES = 25 * 1024 * 1024

# extension -> detected MIME for allowlisted formats only.
ALLOWLIST: dict[str, str] = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
}

# detected MIME -> canonical extension used in opaque keys.
MIME_TO_EXT: dict[str, str] = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
}


@dataclass
class UploadInput:
    name: str
    declared_mime: str
    data: bytes


@dataclass
class InspectionResult:
    state: ArtifactState
    detected_mime: str | None
    sha256: str
    scan_result: str
    reason: str | None = None


def detect_mime(data: bytes) -> str | None:
    """Detect real type via magic bytes. Returns None when unknown."""
    if data.startswith(b"#!/") or data.startswith(b"#! "):
        return None  # shell script: never allowlisted
    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"PK\x03\x04"):
        # ZIP container; pilot allowlist admits only docx.
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if b"\x00" not in data[:4096]:
        try:
            data[:4096].decode("utf-8")
        except UnicodeDecodeError:
            return None
        return "text/plain"
    return None


class MalwareScanner:
    """Injectable scan adapter. Returns 'clean' | 'infected' or raises."""

    def scan(self, data: bytes, detected_mime: str | None) -> str:
        raise NotImplementedError


class NoOpScanner(MalwareScanner):
    """Pass-through default for dev/test: marks everything clean."""

    def scan(self, data: bytes, detected_mime: str | None) -> str:
        return "clean"


PassThroughScanner = NoOpScanner


class FailingScanner(MalwareScanner):
    """Simulates scanner outage: forces needs_manual_review quarantine."""

    def scan(self, data: bytes, detected_mime: str | None) -> str:
        raise RuntimeError("scanner unavailable")


class ScannerUnavailable(RuntimeError):
    pass


class ClamAVScanner(MalwareScanner):
    """ClamAV-compatible stub. Any transport/scan failure -> manual review."""

    def __init__(self, host: str = "localhost", port: int = 3310):
        self.host = host
        self.port = port

    def scan(self, data: bytes, detected_mime: str | None) -> str:
        try:
            import socket

            with socket.create_connection((self.host, self.port), timeout=2):
                pass
        except Exception as e:
            raise ScannerUnavailable(f"clamav unreachable: {e}") from e
        return "clean"


class FileSecurityService:
    def __init__(
        self,
        scanner: MalwareScanner | None = None,
        max_bytes: int = MAX_UPLOAD_BYTES,
    ):
        self.scanner = scanner or NoOpScanner()
        self.max_bytes = max_bytes

    def inspect(self, upload: UploadInput) -> InspectionResult:
        sha = hashlib.sha256(upload.data).hexdigest()
        if len(upload.data) > self.max_bytes:
            return InspectionResult(
                state=ArtifactState.REJECTED,
                detected_mime=None,
                sha256=sha,
                scan_result="not_scanned",
                reason=f"size {len(upload.data)} exceeds limit {self.max_bytes}",
            )
        detected = detect_mime(upload.data)
        if detected is None:
            return InspectionResult(
                state=ArtifactState.REJECTED,
                detected_mime=None,
                sha256=sha,
                scan_result="not_scanned",
                reason="unsupported or undetectable file type (spoofed?)",
            )
        name_lower = (upload.name or "")
        ext = "." + name_lower.rsplit(".", 1)[-1].lower() if "." in name_lower else ""
        expected_mime = ALLOWLIST.get(ext)
        if expected_mime is None or expected_mime != detected:
            return InspectionResult(
                state=ArtifactState.REJECTED,
                detected_mime=detected,
                sha256=sha,
                scan_result="not_scanned",
                reason=f"extension {ext!r} does not match detected type {detected}",
            )
        declared = (upload.declared_mime or "").lower()
        if declared not in (detected, "application/octet-stream"):
            return InspectionResult(
                state=ArtifactState.REJECTED,
                detected_mime=detected,
                sha256=sha,
                scan_result="not_scanned",
                reason=f"declared MIME {upload.declared_mime!r} does not match detected {detected}",
            )
        try:
            verdict = self.scanner.scan(upload.data, detected)
        except Exception:
            return InspectionResult(
                state=ArtifactState.QUARANTINED,
                detected_mime=detected,
                sha256=sha,
                scan_result="needs_manual_review",
                reason="malware scan unavailable; quarantined pending manual review",
            )
        if verdict == "infected":
            return InspectionResult(
                state=ArtifactState.REJECTED,
                detected_mime=detected,
                sha256=sha,
                scan_result="infected",
                reason="malware detected",
            )
        if verdict != "clean":
            return InspectionResult(
                state=ArtifactState.QUARANTINED,
                detected_mime=detected,
                sha256=sha,
                scan_result="needs_manual_review",
                reason=f"inconclusive scan verdict {verdict!r}",
            )
        return InspectionResult(
            state=ArtifactState.SCAN_PASSED,
            detected_mime=detected,
            sha256=sha,
            scan_result="clean",
            reason=None,
        )

    def store_verified(self, upload: UploadInput) -> str:
        """Return an opaque server-generated object key.

        Never embeds the client filename (path-traversal safe); the suffix
        extension comes from the detected type only.
        """
        detected = detect_mime(upload.data)
        ext = MIME_TO_EXT.get(detected or "", "")
        return f"verified/{uuid.uuid4().hex}{ext}"


def assert_downloadable(state: str) -> None:
    """Prohibit download before scan_passed."""
    if state not in DOWNLOADABLE_STATES:
        raise PermissionError(f"download prohibited while artifact is {state}")
