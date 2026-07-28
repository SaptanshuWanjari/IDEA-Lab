from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.services.retrieval import Reranker


def test_reranker_sorts_by_score():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"id": "a", "text": "first", "score": 0.5},
        {"id": "b", "text": "second", "score": 0.5},
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "a: 3\nb: 8"}}
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    assert result[0]["id"] == "b"
    assert result[1]["id"] == "a"


def test_reranker_build_prompt_includes_ids_and_text():
    reranker = Reranker()
    candidates = [{"id": "x", "text": "clause text"}]
    prompt = reranker._build_prompt("my query", candidates)
    assert "x:" in prompt
    assert "clause text" in prompt
    assert "my query" in prompt


def test_reranker_parse_scores_filters_invalid_labels():
    reranker = Reranker()
    content = "a: 5\nfoo: 9\nb: 7"
    scores = reranker._parse_scores(content, valid_ids={"a", "b"})
    assert scores == {"a": 5, "b": 7}


def test_reranker_ignores_prose_lines():
    reranker = Reranker()
    content = "Overall scores: 5\na: 4\nb: 6"
    scores = reranker._parse_scores(content, valid_ids={"a", "b"})
    assert scores == {"a": 4, "b": 6}


def test_reranker_empty_candidates():
    reranker = Reranker()
    assert reranker.rerank("q", []) == []


def test_reranker_fallback_on_http_error():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"id": "a", "text": "first", "score": 0.1},
        {"id": "b", "text": "second", "score": 0.9},
    ]

    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPError("boom")

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    # Should fall back to original RRF scores
    assert result[0]["id"] == "b"
    assert result[1]["id"] == "a"


def test_reranker_injected_into_retrieval_service():
    from app.services.retrieval import RetrievalService
    from app.vector.client import HybridVectorStore
    from app.graph.client import GraphClient

    mock_reranker = MagicMock()
    mock_reranker.rerank.return_value = [{"id": "a", "text": "t", "score": 1.0, "source": "vector"}]

    store = MagicMock(spec=HybridVectorStore)
    store.dense_search.return_value = []
    store.bm25_search.return_value = [{"chunk_id": "a", "score": 1.0}]

    graph = MagicMock(spec=GraphClient)
    graph.run.return_value = []

    service = RetrievalService(store, graph, reranker=mock_reranker)
    result = service.search("query", limit=5)

    mock_reranker.rerank.assert_called_once()
    assert result[0]["id"] == "a"
