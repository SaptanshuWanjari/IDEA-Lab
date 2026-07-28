from unittest.mock import MagicMock, patch

from app.llm.embeddings import EmbeddingClient


def test_embedding_client_returns_vector():
    client = EmbeddingClient(model="nomic-embed-text")
    mock_response = MagicMock()
    mock_response.json.return_value = {"embedding": [0.1, 0.2, 0.3]}
    mock_response.raise_for_status = MagicMock()

    with patch("app.llm.embeddings.httpx.post", return_value=mock_response) as mock_post:
        result = client.embed("hello")

    mock_post.assert_called_once()
    assert result == [0.1, 0.2, 0.3]
