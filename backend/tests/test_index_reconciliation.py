"""Index/graph reconciliation reports missing clauses per source version."""
import pytest

from app.services.index_reconciliation import IndexReconciler


@pytest.mark.asyncio
async def test_reconcile_reports_missing_graph_clause():
    reconciler = IndexReconciler(
        index_fetcher=lambda sv: ["3.1", "3.2"],
        graph_fetcher=lambda sv: ["3.1"],
    )
    report = await reconciler.compare("sv-1")
    assert report.missing_graph_clause_ids == ["3.2"]
    assert report.missing_index_clause_ids == []
    assert report.healthy is False


@pytest.mark.asyncio
async def test_reconcile_reports_missing_index_clause():
    reconciler = IndexReconciler(
        index_fetcher=lambda sv: ["3.1"],
        graph_fetcher=lambda sv: ["3.1", "3.2"],
    )
    report = await reconciler.compare("sv-1")
    assert report.missing_index_clause_ids == ["3.2"]
    assert report.healthy is False


@pytest.mark.asyncio
async def test_reconcile_healthy_when_sets_match():
    reconciler = IndexReconciler(
        index_fetcher=lambda sv: ["3.1", "3.2"],
        graph_fetcher=lambda sv: ["3.2", "3.1"],
    )
    report = await reconciler.compare("sv-1")
    assert report.healthy is True
    assert report.missing_graph_clause_ids == []
    assert report.missing_index_clause_ids == []
    assert report.source_version_id == "sv-1"
