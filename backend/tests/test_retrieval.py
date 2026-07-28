from unittest.mock import MagicMock

from app.graph.client import GraphClient
from app.services.retrieval import RetrievalService
from app.vector.client import HybridVectorStore


def test_rrf():
    service = RetrievalService.__new__(RetrievalService)
    a = [type("X", (), {"id": "a"})(), type("X", (), {"id": "b"})()]
    b = [{"chunk_id": "c"}, {"chunk_id": "a"}]
    fused = service._reciprocal_rank_fusion(a, b)
    assert len(fused) == 3
    ids = {item["id"] for item in fused}
    assert ids == {"a", "b", "c"}


def test_search_embeds_query_and_uses_vector_for_dense_search():
    store = MagicMock(spec=HybridVectorStore)
    store.dense_search.return_value = []
    store.bm25_search.return_value = []

    graph = MagicMock(spec=GraphClient)
    graph.run.return_value = []

    mock_embedder = MagicMock()
    mock_embedder.embed.return_value = [0.5] * 768

    service = RetrievalService(store, graph, embedder=mock_embedder)
    result = service.search("compliance query", limit=5)

    mock_embedder.embed.assert_called_once_with("compliance query")
    store.dense_search.assert_called_once_with(
        "regulation_chunks", [0.5] * 768, limit=50, filters={}
    )
    assert result == []
