"""Task 4: quarantined file custody tests (DB-independent)."""

import pytest

from app.services.file_security import (
    ArtifactState,
    FileSecurityService,
    UploadInput,
)


def _pdf_bytes():
    return b"%PDF-1.4 fake content\n%%EOF"


def test_spoofed_pdf_is_quarantined():
    service = FileSecurityService()
    result = service.inspect(
        UploadInput(name="report.pdf", declared_mime="application/pdf", data=b"#!/bin/sh\necho hi")
    )
    assert result.state == ArtifactState.REJECTED


def test_storage_key_does_not_contain_client_filename():
    service = FileSecurityService()
    key = service.store_verified(
        UploadInput(name="../../board.pdf", declared_mime="application/pdf", data=_pdf_bytes())
    )
    assert "board.pdf" not in key
    assert ".." not in key
    assert "/" not in key.replace("quarantine/", "").replace("verified/", "") or "board" not in key


def test_oversize_rejected():
    service = FileSecurityService(max_bytes=10)
    result = service.inspect(
        UploadInput(name="big.pdf", declared_mime="application/pdf", data=_pdf_bytes() + b"x" * 100)
    )
    assert result.state == ArtifactState.REJECTED
    assert "size" in (result.reason or "").lower()


def test_scan_failure_needs_review():
    from app.services.file_security import FailingScanner

    service = FileSecurityService(scanner=FailingScanner())
    result = service.inspect(
        UploadInput(name="doc.pdf", declared_mime="application/pdf", data=_pdf_bytes())
    )
    assert result.state == ArtifactState.QUARANTINED
    assert result.scan_result == "needs_manual_review"


def test_unauthorized_download_blocked():
    from app.services.file_security import assert_downloadable

    with pytest.raises(PermissionError):
        assert_downloadable("QUARANTINED")
    # scan-passed state must be downloadable
    assert_downloadable("SCAN_PASSED")
