from typing import Annotated, Literal

from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, NoDecode


def _split_origins(v) -> list[str]:
    if isinstance(v, str):
        return [o.strip() for o in v.split(",") if o.strip()]
    return v


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://pravah:pravah@localhost:5432/pravah"
    test_database_url: str | None = None

    # Vector store
    qdrant_url: str = "http://localhost:6333"

    # Graph store
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "pravah"

    # Object storage
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False

    # Ollama base URL
    ollama_url: str = "http://localhost:11434"

    # Ollama models (override in .env)
    ollama_chat_model: str = "qwen3:8b"
    ollama_embedding_model: str = "nomic-embed-text"
    ollama_rerank_model: str = "qwen2.5:14b"

    # Timeouts and generation limits
    ollama_embed_timeout: float = 60.0
    ollama_chat_timeout: float = 600.0
    ollama_rerank_timeout: float = 30.0
    ollama_rerank_connect_timeout: float = 5.0
    ollama_rerank_max_tokens: int = 500
    ollama_chat_max_tokens: int = 16384
    ollama_chat_temperature: float = 0.2
    ollama_relation_max_tokens: int = 1000

    # Auth
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Runtime profile
    environment: Literal["development", "test", "pilot", "production"] = "development"
    cookie_secure: bool = False
    allowed_origins: Annotated[list[str], NoDecode, BeforeValidator(_split_origins)] = [
        "http://localhost:3000",
        "http://localhost:8443",
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
