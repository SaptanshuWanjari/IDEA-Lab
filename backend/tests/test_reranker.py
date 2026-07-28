from unittest.mock import MagicMock, patch

import httpx

from app.services.retrieval import Reranker, RetrievalService


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


def test_reranker_prompt_wraps_query_and_candidates_in_delimiters():
    reranker = Reranker()
    prompt = reranker._build_prompt("my query", [{"id": "a", "text": "text"}])
    assert "<<<QUERY_BEGIN>>>" in prompt
    assert "<<<QUERY_END>>>" in prompt
    assert "<<<QUERY_BEGIN>>>\nmy query\n<<<QUERY_END>>>" in prompt
    assert "<<<CANDIDATE_BEGIN>>>" in prompt
    assert "<<<CANDIDATE_END>>>" in prompt
    assert "untrusted data" in prompt


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


def test_retrieval_service_flow():
    from app.graph.client import GraphClient
    from app.vector.client import HybridVectorStore

    # Mock vector store: dense result for 'a', BM25 result for 'b'
    store = MagicMock(spec=HybridVectorStore)
    dense_point = MagicMock()
    dense_point.id = "a"
    dense_point.payload = {"text": "dense a", "clause": "1"}
    store.dense_search.return_value = [dense_point]
    store.bm25_search.return_value = [{"chunk_id": "b", "score": 2.0}]

    graph = MagicMock(spec=GraphClient)
    graph.run.return_value = [{"id": "c", "text": "related"}]

    reranker = MagicMock()
    reranker.rerank.return_value = [
        {"id": "a", "text": "dense a", "score": 9.0, "score_source": "llm", "source": "vector"},
    ]

    service = RetrievalService(store, graph, reranker=reranker)
    result = service.search("query", limit=1)

    reranker.rerank.assert_called_once()
    assert result[0]["id"] == "a"
    assert result[0]["score_source"] == "llm"
    # Graph expansion keeps parent's score_source and marks source as graph
    assert any(r["id"] == "c" and r["score_source"] == "llm" and r["source"] == "graph" for r in result)


def test_retrieval_service_includes_bm25_text():
    from app.graph.client import GraphClient
    from app.vector.client import HybridVectorStore

    store = MagicMock(spec=HybridVectorStore)
    dense_point = MagicMock()
    dense_point.id = "a"
    dense_point.payload = {"text": "dense a"}
    store.dense_search.return_value = [dense_point]
    store.bm25_search.return_value = [{"chunk_id": "b", "score": 2.0}]

    graph = MagicMock(spec=GraphClient)
    graph.run.return_value = []

    captured = {}
    class CaptureReranker:
        def rerank(self, query, candidates):
            captured["candidates"] = candidates
            return sorted(candidates, key=lambda x: x["score"], reverse=True)

    service = RetrievalService(store, graph, reranker=CaptureReranker())
    service.search("query", limit=5)

    by_id = {c["id"]: c for c in captured["candidates"]}
    assert by_id["b"]["text"] == ""
    assert "a" in by_id


def test_reranker_falls_back_when_partial_scores():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"id": "a", "text": "first", "score": 0.1},
        {"id": "b", "text": "second", "score": 0.9},
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "a: 10"}}  # only a scored
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    # Should fall back entirely to original RRF scores
    assert result[0]["id"] == "b"
    assert result[1]["id"] == "a"


def test_reranker_normalizes_score_field():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"id": "a", "text": "first", "score": 0.1},
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "a: 7"}}
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    assert result[0]["score"] == 7
    assert result[0]["score_source"] == "llm"


def test_reranker_clamps_out_of_range_scores():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"id": "a", "text": "first", "score": 0.5},
        {"id": "b", "text": "second", "score": 0.5},
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "a: 999\nb: -5"}}
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    assert result[0]["id"] == "a"  # clamped to 10
    assert result[1]["id"] == "b"  # clamped to 0
    assert result[0]["score"] == 10
    assert result[1]["score"] == 0


def test_reranker_handles_tied_scores():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"id": "a", "text": "first", "score": 0.5},
        {"id": "b", "text": "second", "score": 0.5},
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "a: 5\nb: 5"}}
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    assert {r["id"] for r in result} == {"a", "b"}
    assert result[0]["score"] == result[1]["score"]


def test_reranker_candidate_without_id():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"text": "no id", "score": 0.5},
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "no id: 5"}}
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    assert len(result) == 1
    # Candidates without an explicit id are labeled by their text, so the LLM score matches.
    assert result[0]["score"] == 5


def test_reranker_fallback_on_malformed_response():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"id": "a", "text": "first", "score": 0.1},
        {"id": "b", "text": "second", "score": 0.9},
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {}  # missing message/content
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    assert result[0]["id"] == "b"
    assert result[1]["id"] == "a"
