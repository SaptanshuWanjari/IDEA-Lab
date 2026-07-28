"""Embedding client for Ollama's /api/embeddings endpoint."""

import json as _json

import httpx

from app.config import settings


class EmbeddingClient:
    def __init__(self, model: str | None = None, url: str | None = None):
        self.model = model or settings.ollama_embedding_model
        self.url = url or settings.ollama_url

    def embed(self, text: str) -> list[float]:
        try:
            response = httpx.post(
                f"{self.url.rstrip('/')}/api/embeddings",
                json={"model": self.model, "prompt": text},
                timeout=settings.ollama_embed_timeout,
            )
            response.raise_for_status()
            data = response.json()
        except (httpx.HTTPError, _json.JSONDecodeError) as e:
            raise RuntimeError(f"Embedding request failed: {e}") from e

        if "error" in data:
            raise RuntimeError(f"Embedding model error: {data['error']}")
        if "embedding" not in data:
            raise ValueError(f"Unexpected embedding response: {list(data.keys())}")
        return data["embedding"]
