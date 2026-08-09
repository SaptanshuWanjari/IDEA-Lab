.PHONY: setup up down logs health models test shell-api shell-web

# Read model names from .env as the single source of truth.
ifneq (,$(wildcard .env))
  include .env
  export
endif

MODEL_CHAT ?= $(or $(OLLAMA_CHAT_MODEL),qwen3:8b)
MODEL_EMBED ?= $(or $(OLLAMA_EMBEDDING_MODEL),nomic-embed-text)

setup:
	docker compose up -d

up:
	docker compose up 

down:
	docker compose down

logs:
	docker compose logs -f

health:
	@echo "API:"
	@curl -s http://localhost:8000/health || echo "API not reachable"
	@echo "\nQdrant:"
	@curl -s http://localhost:6333/healthz >/dev/null && echo "ok" || echo "not reachable"
	@echo "MinIO:"
	@curl -s http://localhost:9000/minio/health/live >/dev/null && echo "ok" || echo "not reachable"
	@echo "Ollama:"
	@curl -s http://localhost:11434/api/tags >/dev/null && echo "ok" || echo "not reachable"

models:
	ollama pull $(MODEL_CHAT)
	ollama pull $(MODEL_EMBED)

test:
	cd backend && uv run pytest -v

smoke:
	@echo "=== Neo4j (from api container) ==="
	@docker compose exec -T api uv run python -c "\
from app.config import settings; \
from app.graph.client import GraphClient; \
c = GraphClient(); \
r = c.run('MATCH (n) RETURN count(n) AS nodes'); \
print(f'ok  ({r[0][\"nodes\"]} nodes)')"
	@echo ""
	@echo "=== Ollama embed (from api container) ==="
	@docker compose exec -T api uv run python -c "\
from app.llm.embeddings import OllamaEmbedder; \
e = OllamaEmbedder(); \
v = e.embed('test'); \
d = len(v); \
print('ok  (' + str(d) + ' dims)')"
	@echo ""
	@echo "=== Ollama chat (from api container) ==="
	@docker compose exec -T api uv run python -c "\
from app.llm.client import LLMClient; \
c = LLMClient(); \
r = c.chat([{'role':'user','content':'Say hello in one word.'}], max_tokens=8); \
print('ok  (\"' + r.strip() + '\")')"
	@echo "\nAll smoke checks passed.\n"

shell-api:
	docker compose exec api bash

shell-web:
	docker compose exec web sh
