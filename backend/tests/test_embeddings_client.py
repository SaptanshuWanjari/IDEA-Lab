from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.llm.embeddings import EmbeddingClient


def test_embedding_client_returns_vector():
    client = EmbeddingClient(model="nomic-embed-text")
    mock_response = MagicMock()
    mock_response.json.return_value = {"embedding": [0.1, 0.2, 0.3]}
    mock_response.raise_for_status = MagicMock()

    with patch("app.llm.embeddings.httpx.post", return_value=mock_response) as mock_post:
        result = client.embed("hello")

    mock_post.assert_called_once_with(
        "http://localhost:11434/api/embeddings",
        json={"model": "nomic-embed-text", "prompt": "hello"},
        timeout=60.0,
    )
    assert result == [0.1, 0.2, 0.3]


def test_embedding_client_uses_default_model():
    client = EmbeddingClient()
    assert client.model == "nomic-embed-text"  # default from config


def test_embedding_client_raises_on_http_error():
    client = EmbeddingClient(model="nomic-embed-text")
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPError("boom")

    with patch("app.llm.embeddings.httpx.post", return_value=mock_response):
        with pytest.raises(RuntimeError, match="Embedding request failed"):
            client.embed("hello")


def test_embedding_client_raises_on_missing_embedding_key():
    client = EmbeddingClient(model="nomic-embed-text")
    mock_response = MagicMock()
    mock_response.json.return_value = {"error": "model not found"}
    mock_response.raise_for_status = MagicMock()

    with patch("app.llm.embeddings.httpx.post", return_value=mock_response):
        with pytest.raises(ValueError, match="Unexpected embedding response"):
            client.embed("hello")
