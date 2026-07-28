import pytest
import pytest_asyncio
from unittest.mock import MagicMock, patch

from app.llm.client import LLMClient
from app.llm.embeddings import EmbeddingClient


# ponytail: no DB needed for pure mocked LLM tests; override conftest autouse
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    yield


def test_llm_client_chat_mocked():
    client = LLMClient()
    mock_response = MagicMock()
    mock_response.json.return_value = {"message": {"content": "hello"}}
    mock_response.raise_for_status = MagicMock()

    with patch("app.llm.client.httpx.post", return_value=mock_response):
        result = client.chat([{"role": "user", "content": "hi"}])

    assert result == "hello"


def test_embedding_client_embed_mocked():
    client = EmbeddingClient()
    mock_response = MagicMock()
    mock_response.json.return_value = {"embedding": [0.1, 0.2]}
    mock_response.raise_for_status = MagicMock()

    with patch("app.llm.embeddings.httpx.post", return_value=mock_response):
        result = client.embed("hi")

    assert result == [0.1, 0.2]


@pytest.mark.skip(reason="Requires Ollama running")
def test_llm_chat_live():
    client = LLMClient()
    response = client.chat([{"role": "user", "content": "Say hello"}])
    assert len(response) > 0


@pytest.mark.skip(reason="Requires Ollama running")
def test_embedding_embed_live():
    client = EmbeddingClient()
    vector = client.embed("hello")
    assert len(vector) > 0
