.PHONY: setup up down logs health models test shell-api shell-web

# Read model names from .env as the single source of truth.
ifneq (,$(wildcard .env))
  include .env
  export
endif

MODEL_CHAT ?= $(or $(OLLAMA_CHAT_MODEL),qwen2.5:14b)
MODEL_EMBED ?= $(or $(OLLAMA_EMBEDDING_MODEL),nomic-embed-text)

setup:
	docker compose up -d

up:
	docker compose up -d

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

shell-api:
	docker compose exec api bash

shell-web:
	docker compose exec web sh
