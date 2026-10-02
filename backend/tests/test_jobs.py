"""Task 5: idempotent background job tests (DB-independent)."""

import pytest

from app.models.job import JobKind
from app.services.job_service import JobService, compute_idempotency_key


class FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class FakeSession:
    """Minimal async session double: execute/add/commit/refresh/get."""

    def __init__(self):
        self.jobs = []
        self.added = []

    async def execute(self, stmt):
        return FakeResult(None)

    def add(self, obj):
        self.added.append(obj)
        self.jobs.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


def test_idempotency_key_stable():
    k1 = compute_idempotency_key(JobKind.index_document, "v1", "hash1")
    k2 = compute_idempotency_key(JobKind.index_document, "v1", "hash1")
    assert k1 == k2
    assert compute_idempotency_key(JobKind.extract_document, "v1", "hash1") != k1


@pytest.mark.asyncio
async def test_same_index_request_returns_existing_active_job():
    session = FakeSession()
    service = JobService(session)

    class SourceVersion:
        id = "version-1"
        content_hash = "abc123"

    source_version = SourceVersion()
    first = await service.enqueue_unique(JobKind.index_document, source_version.id, source_version.content_hash)

    # Simulate persistence of first job: second enqueue must find it.
    async def execute_found(stmt):
        return FakeResult(first)

    session.execute = execute_found
    second = await service.enqueue_unique(JobKind.index_document, source_version.id, source_version.content_hash)
    assert second.id == first.id


@pytest.mark.asyncio
async def test_failed_job_does_not_block_new_enqueue():
    session = FakeSession()
    service = JobService(session)

    old = await service.enqueue_unique(JobKind.scan_document, "v9", "h9")
    old.status = "FAILED"

    async def execute_found(stmt):
        return FakeResult(old)

    session.execute = execute_found
    new = await service.enqueue_unique(JobKind.scan_document, "v9", "h9")
    assert new.id != old.id


@pytest.mark.asyncio
async def test_terminal_error_goes_to_manual_review():
    session = FakeSession()
    service = JobService(session)
    job = await service.enqueue_unique(JobKind.extract_document, "v2", "h2")
    updated = await service.mark_terminal(job, error_category="parser_error")
    assert updated.status == "NEEDS_MANUAL_REVIEW"


@pytest.mark.asyncio
async def test_transient_failure_increments_retry():
    session = FakeSession()
    service = JobService(session)
    job = await service.enqueue_unique(JobKind.index_document, "v3", "h3")
    updated = await service.mark_transient_failure(job, error_category="timeout")
    assert updated.status == "PENDING"
    assert updated.retry_count == 1
