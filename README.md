# PravahOS

A Next.js + FastAPI platform for ingesting RBI circulars, generating human-reviewed compliance MAPs (Measurable Action Points), predicting implementation bottlenecks with a Digital Compliance Twin, and producing audit-ready reports.

---

## Tech Stack

- **Frontend:** React, Vite, TailwindCSS (Electron Desktop App)
- **Backend:** FastAPI, SQLAlchemy (async), Pydantic, LangGraph
- **Databases:** PostgreSQL, Qdrant (vectors), Neo4j (knowledge graph)
- **Storage:** MinIO
- **Models:** Ollama (local) with optional OpenAI fallback
- **Search:** Tantivy (BM25) + Ollama embeddings + LLM reranker
- **Package Manager:** uv (Python), npm (Node)

---

## Development Setup

### 1. Clone and Configure

```bash
git clone <repo-url>
cd IDEA-Lab
cp .env.example .env
```

Edit `.env` and change `SECRET_KEY` for any non-local use.

### 1a. Pilot Runtime Profile

The backend validates its runtime profile at startup (`validate_runtime_settings`
in `backend/app/config_profiles.py`, wired into `backend/app/main.py`):

| `ENVIRONMENT` | Public registration | Secure cookies | Secrets | CORS origins |
|---|---|---|---|---|
| `development` / `test` | allowed | not required | defaults allowed | defaults allowed |
| `pilot` / `production` | disabled | `COOKIE_SECURE=true` required | non-default `SECRET_KEY` (min 32 chars, injected via secret management) required | explicit non-`*` `ALLOWED_ORIGINS` list required |

Pilot startup refuses insecure defaults: a default `SECRET_KEY`, `COOKIE_SECURE=false`,
or a wildcard/empty `ALLOWED_ORIGINS` raises `ValueError` before the app serves traffic.
For pilot deployments, keep data services (Postgres/Qdrant/Neo4j/MinIO) on the private
compose network only (no published data ports) and set `ENVIRONMENT=pilot`,
`COOKIE_SECURE=true`, `ALLOWED_ORIGINS=https://<pilot-host>`, plus an injected `SECRET_KEY`.

### 2. Install Ollama (Local)

Ollama runs on the host, not in Docker. Install it from [ollama.com](https://ollama.com), then start it:

```bash
ollama serve
```

### 3. Start Infrastructure

```bash
make setup
```

This starts:

- Postgres (`localhost:5432`)
- Qdrant (`localhost:6333`)
- Neo4j (`localhost:7474`, `localhost:7687`)
- MinIO (`localhost:9000`, console `localhost:9001`)
- API (`localhost:8000`)

All services have Docker healthchecks, and the API waits for dependencies to be healthy.

### 4. Start Desktop App

The UI is an Electron desktop application built with React and Vite.

```bash
cd frontend
npm install
npm run dev:desktop
```

### 5. Pull Ollama Models

The Makefile does not pull models automatically so you can choose your own.

```bash
# Default models
make models

# Or specify custom models
make models MODEL_CHAT=llama3.1 MODEL_EMBED=qwen3-embedding:0.6b
```

Equivalently:

```bash
ollama pull minimax-m3:cloud
ollama pull qwen3-embedding:0.6b
```

Models are configurable via `.env`:

```text
OLLAMA_CHAT_MODEL=minimax-m3:cloud
OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b
OLLAMA_RERANK_MODEL=minimax-m3:cloud
```

### 6. Verify Services

```bash
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

### 7. Run Tests

```bash
cd backend
uv sync
uv run pytest -v
```

Expected baseline without external services:

```text
54 passed, 12 skipped, 1 warning
```

To run DB tests against Supabase:

```bash
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:<password>@db.<project>.supabase.co:5432/postgres"
uv run pytest tests/test_auth.py -v
```

---

## Project Layout

```text
IDEA-Lab/
├── backend/
│   ├── app/
│   │   ├── agents/          # LangGraph pipeline nodes
│   │   ├── graph/           # Neo4j client
│   │   ├── llm/             # LLM + embedding clients
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routers/         # FastAPI routes
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── vector/          # Qdrant + Tantivy client
│   ├── tests/
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/                 # Electron Desktop App
├── scripts/
│   └── seed_demo.py         # Demo data seeder
├── docker-compose.yml
├── Makefile
├── .env.example
└── docs/
    ├── backend-testing-guide.md
    └── plans/
```

---

## Common Commands

| Command | Purpose |
|---------|---------|
| `make setup` | Start all Docker services |
| `make up` | Start services (alias) |
| `make down` | Stop all services |
| `make logs` | Tail Docker logs |
| `make health` | Check API/Qdrant/MinIO/Ollama health |
| `make models` | Pull default Ollama models |
| `make test` | Run backend tests |
| `make shell-api` | Bash into the API container |
| `make shell-web` | Shell into the web container |
| `cd backend && uv run pytest tests/test_reranker.py -v` | Run one test file |
| `python scripts/seed_demo.py --pdf sample.pdf` | Seed demo user + upload/regulation |

---

## Quick Smoke Test

After `make setup` and pulling models:

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pravah.in","password":"admin123","role":"compliance_officer"}' \
  -c cookies.txt

# Upload a regulation
curl -X POST http://localhost:8000/regulations/ \
  -b cookies.txt \
  -F "title=Sample RBI Circular" \
  -F "file=@/path/to/circular.pdf"

# Capture regulation id as $REG, then generate MAPs
curl -X POST "http://localhost:8000/regulations/$REG/generate" -b cookies.txt

# View graph, simulation, and report
curl "http://localhost:8000/regulations/$REG/graph" -b cookies.txt
curl "http://localhost:8000/regulations/$REG/simulate" -b cookies.txt
curl "http://localhost:8000/reports/$REG/report" -b cookies.txt
```

See `docs/backend-testing-guide.md` for the full manual testing checklist.

---

## Testing with AI

The platform is designed to be tested alongside an LLM. Useful prompts:

- **Generate synthetic RBI circulars** for upload tests.
- **Generate expected MAPs** from extracted clauses and compare to `/generate` output.
- **Validate dependency graphs** against `/regulations/{id}/graph`.
- **Judge retrieval quality** against `RetrievalService.search` results.
- **Audit compliance reports** for missing evidence or uncovered clauses.

See `docs/backend-testing-guide.md` section "Using AI to Test" for prompt templates.

---

## Notes

- Do not commit `.env` or database credentials.
- The backend defaults to local services; override with environment variables.
- `requirements.txt` is generated from `pyproject.toml` via `uv export`.
- The reranker is LLM-based and intentionally synchronous in the MVP; latency is bounded by a 30s timeout.
