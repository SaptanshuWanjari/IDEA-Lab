"""Scope isolation: chunk identity uniqueness + identical dense/BM25 scope filters."""
from unittest.mock import MagicMock

from app.graph.client import GraphClient
from app.services.embeddings import ChunkIdentity
from app.services.retrieval import RetrievalScope, RetrievalService
from app.vector.client import HybridVectorStore


def _point(id_, payload):
    p = MagicMock()
    p.id = id_
    p.payload = payload
    p.text = payload.get("text", "")
    return p


def test_chunk_ids_are_unique_across_same_sized_documents():
    assert ChunkIdentity.create("version-a", 0) != ChunkIdentity.create("version-b", 0)
    assert ChunkIdentity.create("version-a", 0) != ChunkIdentity.create("version-a", 1)
    assert ChunkIdentity.create("version-a", 0) == "version-a:0"


def test_bm25_and_dense_apply_same_scope_filters():
    store = MagicMock(spec=HybridVectorStore)
    store.dense_search.return_value = []
    store.bm25_search.return_value = []
    graph = MagicMock(spec=GraphClient)
    graph.run.return_value = []
    embedder = MagicMock()
    embedder.embed.return_value = [0.1] * 8

    service = RetrievalService(store, graph, embedder=embedder)
    scope = RetrievalScope(
        bank_id="bank-1",
        legal_entity_ids=["le-1"],
        regulation_version_ids=["rv-1"],
    )
    service.search("incident reporting", scope)

    dense_filters = store.dense_search.call_args.kwargs["filters"]
    bm25_filters = store.bm25_search.call_args.kwargs["filters"]
    assert dense_filters["bank_id"] == "bank-1"
    assert bm25_filters["bank_id"] == "bank-1"
    # Same scope values on both backends:
    assert dense_filters["legal_entity_id"] == ["le-1"]
    assert bm25_filters["legal_entity_id"] == ["le-1"]
    assert dense_filters["regulation_version_id"] == ["rv-1"]
    assert bm25_filters["regulation_version_id"] == ["rv-1"]


def test_search_returns_only_scoped_results():
    store = MagicMock(spec=HybridVectorStore)
    store.dense_search.return_value = [
        _point("version-a:0", {"text": "a incident", "bank_id": "bank-1",
                               "legal_entity_id": "le-1", "regulation_version_id": "rv-1",
                               "regulation_id": "reg-a", "clause": "1"}),
        _point("version-b:0", {"text": "b incident", "bank_id": "bank-2",
                               "legal_entity_id": "le-9", "regulation_version_id": "rv-9",
                               "regulation_id": "reg-b", "clause": "1"}),
    ]
    store.bm25_search.return_value = [
        {"chunk_id": "version-a:0", "score": 2.0, "bank_id": "bank-1",
         "legal_entity_id": "le-1", "regulation_version_id": "rv-1"},
        {"chunk_id": "version-b:0", "score": 3.0, "bank_id": "bank-2",
         "legal_entity_id": "le-9", "regulation_version_id": "rv-9"},
    ]
    graph = MagicMock(spec=GraphClient)
    graph.run.return_value = []

    class Passthrough:
        def rerank(self, query, candidates):
            return sorted(candidates, key=lambda c: c["score"], reverse=True)

    embedder = MagicMock()
    embedder.embed.return_value = [0.1] * 8
    service = RetrievalService(store, graph, reranker=Passthrough(), embedder=embedder)
    scope = RetrievalScope(bank_id="bank-1", legal_entity_ids=["le-1"],
                           regulation_version_ids=["rv-1"])
    results = service.search("incident reporting", scope)

    assert results, "expected at least one in-scope result"
    assert {r["id"] for r in results} == {"version-a:0"}
    assert {r.get("bank_id") for r in results} == {"bank-1"}


def test_reranker_receives_only_scoped_candidates():
    store = MagicMock(spec=HybridVectorStore)
    store.dense_search.return_value = [
        _point("version-a:0", {"text": "a", "bank_id": "bank-1",
                               "legal_entity_id": "le-1", "regulation_version_id": "rv-1"}),
        _point("version-b:0", {"text": "b", "bank_id": "bank-2",
                               "legal_entity_id": "le-9", "regulation_version_id": "rv-9"}),
    ]
    store.bm25_search.return_value = []
    graph = MagicMock(spec=GraphClient)
    graph.run.return_value = []
    seen = {}

    class Capture:
        def rerank(self, query, candidates):
            seen["ids"] = [c["id"] for c in candidates]
            return candidates

    embedder = MagicMock()
    embedder.embed.return_value = [0.1] * 8
    service = RetrievalService(store, graph, reranker=Capture(), embedder=embedder)
    scope = RetrievalScope(bank_id="bank-1", legal_entity_ids=["le-1"],
                           regulation_version_ids=["rv-1"])
    service.search("q", scope)
    assert seen["ids"] == ["version-a:0"]
