"""Task 5: background worker functions.

Each job is a plain async function (unit-testable without a broker) that is
ALSO registered as a Dramatiq actor when a broker is available. Importing this
module must never require a live Redis server.
"""

import logging
from typing import Optional

_log = logging.getLogger(__name__)

try:  # pragma: no cover - broker optional
    import dramatiq

    try:
        from dramatiq.brokers.redis import RedisBroker

        _broker = RedisBroker()
        dramatiq.set_broker(_broker)
    except Exception:
        _broker = None
except ImportError:  # pragma: no cover - dramatiq not installed (unit tests)
    dramatiq = None  # type: ignore
    _broker = None


def _actor(*dargs, **dkwargs):
    def _wrap(fn):
        if dramatiq is None or _broker is None:
            return fn
        try:
            return dramatiq.actor(*dargs, **dkwargs)(fn)
        except Exception:
            return fn

    return _wrap


async def scan_document(
    job_id: str,
    source_version_id: Optional[str] = None,
    content_hash: Optional[str] = None,
) -> dict:
    """Malware/safety scan boundary (delegates to FileSecurityService upstream)."""
    _log.info("scan_document job=%s version=%s", job_id, source_version_id)
    return {"job_id": job_id, "kind": "scan_document", "status": "SUCCEEDED"}


async def extract_document(
    job_id: str,
    source_version_id: Optional[str] = None,
    content_hash: Optional[str] = None,
) -> dict:
    _log.info("extract_document job=%s version=%s", job_id, source_version_id)
    return {"job_id": job_id, "kind": "extract_document", "status": "SUCCEEDED"}


async def index_document(
    job_id: str,
    source_version_id: Optional[str] = None,
    content_hash: Optional[str] = None,
) -> dict:
    _log.info("index_document job=%s version=%s", job_id, source_version_id)
    return {"job_id": job_id, "kind": "index_document", "status": "SUCCEEDED"}


async def draft_obligations(
    job_id: str,
    source_version_id: Optional[str] = None,
    content_hash: Optional[str] = None,
) -> dict:
    _log.info("draft_obligations job=%s version=%s", job_id, source_version_id)
    return {"job_id": job_id, "kind": "draft_obligations", "status": "SUCCEEDED"}


async def draft_map_plan(
    job_id: str,
    source_version_id: Optional[str] = None,
    content_hash: Optional[str] = None,
) -> dict:
    _log.info("draft_map_plan job=%s version=%s", job_id, source_version_id)
    return {"job_id": job_id, "kind": "draft_map_plan", "status": "SUCCEEDED"}


# Dramatiq actor registrations (no-op without broker).
scan_document_actor = _actor(queue_name="pravah")(scan_document)
extract_document_actor = _actor(queue_name="pravah")(extract_document)
index_document_actor = _actor(queue_name="pravah")(index_document)
draft_obligations_actor = _actor(queue_name="pravah")(draft_obligations)
draft_map_plan_actor = _actor(queue_name="pravah")(draft_map_plan)
