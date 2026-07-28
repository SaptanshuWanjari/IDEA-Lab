from unittest.mock import MagicMock, patch

from app.services.retrieval import Reranker


def test_reranker_sorts_by_score():
    reranker = Reranker(model="test-model", url="http://test")
    candidates = [
        {"id": "a", "text": "first"},
        {"id": "b", "text": "second"},
    ]

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "message": {"content": "a: 3\nb: 8"}
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.retrieval.httpx.post", return_value=mock_response):
        result = reranker.rerank("query", candidates)

    assert result[0]["id"] == "b"
    assert result[1]["id"] == "a"
