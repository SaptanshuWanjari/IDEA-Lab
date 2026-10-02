"""Graph projection: scoped writes anchored on SourceVersion; no swallowed errors."""
from unittest.mock import MagicMock, patch

import pytest

from app.schemas.document import Clause, DocumentStructure
from app.services.graph_service import GraphService


def _doc():
    return DocumentStructure(clauses=[
        Clause(id="3.1", text="Banks shall report incidents.", section="3"),
        Clause(id="3.2", text="Reports are due within 7 days.", section="3"),
    ])


def test_clause_writes_match_source_version_first_with_scope_params():
    client = MagicMock()
    client.run.return_value = []
    service = GraphService(client)
    with patch("app.services.graph_service.LLMClient") as MockLLM:
        MockLLM.return_value.chat.return_value = "[]"
        service.ingest_regulation(
            "reg-1", "Title", _doc(),
            source_version_id="sv-1", bank_id="bank-1",
            legal_entity_id="le-1", regulation_version_id="rv-1",
        )
    clause_calls = [c for c in client.run.call_args_list if "MERGE (c:Clause" in str(c)]
    assert clause_calls, "expected clause writes"
    for call in clause_calls:
        query = call[0][0]
        params = call[0][1]
        assert "MATCH (sv:SourceVersion" in query
        assert "MERGE (sv)-[:CONTAINS]->(c)" in query
        assert params["source_version_id"] == "sv-1"
        assert params["bank_id"] == "bank-1"
        assert params["legal_entity_id"] == "le-1"
        assert params["regulation_version_id"] == "rv-1"


def test_relation_write_matches_endpoints_before_merge():
    client = MagicMock()
    client.run.return_value = []
    service = GraphService(client)
    service._write_relation("reg-1-3.1", "reg-1-3.2", "REQUIRES")
    query = client.run.call_args[0][0]
    assert "MATCH (a:Clause" in query
    assert "MATCH (b:Clause" in query
    assert "MERGE (a)-[:REQUIRES]->(b)" in query
    assert "MERGE (a:Clause" not in query
    assert "MERGE (b:Clause" not in query


def test_graph_constraint_errors_are_not_swallowed():
    client = MagicMock()
    client.run.side_effect = Exception("ConstraintValidationFailed: already exists")
    service = GraphService(client)
    with pytest.raises(Exception, match="[Cc]onstraint|[Aa]lready exists"):
        service.ingest_regulation("reg-1", "Title", _doc(), source_version_id="sv-1")
    client.run.reset_mock(side_effect=True)
    client.run.side_effect = Exception("ConstraintValidationFailed: boom")
    with pytest.raises(Exception):
        service._write_relation("a", "b", "REQUIRES")


def test_graph_expand_passes_scope_params():
    from app.services.retrieval import RetrievalScope, RetrievalService
    store = MagicMock()
    store.dense_search.return_value = []
    store.bm25_search.return_value = []
    graph = MagicMock(spec=["run"])
    graph.run.return_value = []
    embedder = MagicMock()
    embedder.embed.return_value = [0.0] * 4
    service = RetrievalService(store, graph, embedder=embedder)
    scope = RetrievalScope(bank_id="bank-1", legal_entity_ids=["le-1"],
                           regulation_version_ids=["rv-1"])
    service._graph_expand("reg-1-3.1", scope)
    query, params = graph.run.call_args[0]
    assert params["bank_id"] == "bank-1"
    assert params["legal_entity_ids"] == ["le-1"]
    assert params["regulation_version_ids"] == ["rv-1"]
    assert "bank_id" in query
