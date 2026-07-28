from pydantic_settings import BaseSettings


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
    ollama_chat_model: str = "qwen2.5:14b"
    ollama_embedding_model: str = "nomic-embed-text"
    ollama_rerank_model: str = "qwen2.5:14b"

    # Timeouts and generation limits
    ollama_embed_timeout: float = 60.0
    ollama_chat_timeout: float = 120.0
    ollama_rerank_timeout: float = 30.0
    ollama_rerank_connect_timeout: float = 5.0
    ollama_rerank_max_tokens: int = 500
    ollama_chat_max_tokens: int = 2000
    ollama_chat_temperature: float = 0.2
    ollama_relation_max_tokens: int = 1000

    # Auth
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
