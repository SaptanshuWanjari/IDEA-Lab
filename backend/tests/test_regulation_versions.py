"""Task 5: regulation version tests (DB-independent)."""

import pytest


class FakeQueryResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        class S:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return self._rows

        return S(self._rows)


class FakeSession:
    def __init__(self, existing_versions=None):
        self.existing_versions = list(existing_versions or [])
        self.added = []

    async def execute(self, stmt):
        return FakeQueryResult(self.existing_versions)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


@pytest.mark.asyncio
async def test_reprocessing_creates_new_regulation_version():
    from app.services.job_service import create_reprocessing_version

    session = FakeSession()
    version = await create_reprocessing_version(session, "reg-1", "new-hash")
    assert version.version_number == 1
    assert version.regulation_id == "reg-1"
    assert version.content_hash == "new-hash"


@pytest.mark.asyncio
async def test_reprocessing_never_overwrites_v1():
    from app.services.job_service import create_reprocessing_version

    class V:
        version_number = 1
        content_hash = "old-hash"

    session = FakeSession(existing_versions=[V()])
    version = await create_reprocessing_version(session, "reg-1", "new-hash")
    assert version.version_number == 2
    # v1 untouched
    assert session.existing_versions[0].content_hash == "old-hash"
    assert version.content_hash == "new-hash"


@pytest.mark.asyncio
async def test_reprocess_endpoint_returns_202_with_job_id():
    from unittest.mock import AsyncMock, MagicMock, patch
    from uuid import uuid4

    from app.routers.regulations import reprocess_regulation

    regulation = MagicMock()
    regulation.id = uuid4()
    session = AsyncMock()
    session.get = AsyncMock(return_value=regulation)
    session.commit = AsyncMock()
    user = MagicMock()
    user.id = uuid4()

    with patch("app.routers.regulations.JobService") as MockSvc:
        svc = MockSvc.return_value
        job = MagicMock()
        job.id = uuid4()
        svc.enqueue_unique = AsyncMock(return_value=job)
        with patch("app.routers.regulations.create_reprocessing_version", new=AsyncMock()) as mock_ver:
            mock_ver.return_value = MagicMock(id="v2", version_number=2)
            resp = await reprocess_regulation(regulation.id, session, user)
            assert resp.status_code == 202
            body = resp.body.decode() if hasattr(resp, "body") else None
            assert job is not None
            assert body is not None and str(job.id) in body
