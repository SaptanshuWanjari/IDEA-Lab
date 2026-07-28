import httpx

from app.config import settings


class EmbeddingClient:
    def __init__(self, model: str | None = None, url: str | None = None):
        self.model = model or settings.ollama_embedding_model
        self.url = url or settings.ollama_url

    def embed(self, text: str) -> list[float]:
        response = httpx.post(
            f"{self.url}/api/embeddings",
            json={"model": self.model, "prompt": text},
            timeout=60.0,
        )
        response.raise_for_status()
        return response.json()["embedding"]
