# PravahOS

A React (Electron desktop) + FastAPI platform for ingesting RBI circulars, generating human-reviewed compliance MAPs (Measurable Action Points), predicting implementation bottlenecks with a Digital Compliance Twin, and producing audit-ready reports.

Single-bank pilot build: legal-entity scoped auth, quarantined document custody, async ingestion jobs, cited obligation ledger, versioned MAP plans, content-level evidence review, AI provenance, immutable report snapshots, and calibrated scenario estimates.

---

## Features

### Regulation pipeline

- PDF upload with quarantined document custody (`document_artifacts`) and async jobs (`jobs` + `regulation_versions`) executed by a Dramatiq + Redis worker.
- Reprocess endpoint (`POST /regulations/{id}/reprocess` → `202 Accepted`) for re-ingestion without re-upload.
- Hybrid retrieval: Tantivy (BM25) + Qdrant vectors (Ollama embeddings) + LLM reranker, version-isolated per regulation.
- Neo4j knowledge graph: clause `REQUIRES` / `AMENDS` / `DEFINES` relations with per-clause context.

### Governance (single-bank pilot)

- Cited obligation ledger: every obligation carries source clause citations; citation-invalid predictions never count as true positives.
- Versioned MAP plans: candidate → approve flow with `GET /maps/plans/{id}/diff`.
- Controlled MAP workflow: explicit state transitions (`POST /maps/{id}/transition`) plus review/complete endpoints.
- Content-level evidence: assess draft (`POST /maps/evidence/{id}/assess`) then approve (`.../approve`); only approved content-level evidence counts.
- AI provenance: every generation/assessment run logged in `ai_runs` (model, prompt version, inputs).
- Immutable reports: `POST /maps/snapshots` creates a content-hashed snapshot; `GET /regulations/{id}/report` serves the audit-ready report.
- Pilot evaluation: `POST /regulations/evaluate` scores `recall`, `citation_precision`, `deadline_exact_match`, `owner_agreement`, `reviewer_edit_rate` against a versioned gold set (thresholds: recall ≥ 0.80, precision ≥ 0.90, deadline ≥ 0.90, owner ≥ 0.80).
- Scenario estimates (never forecasts): `GET /regulations/{id}/simulate` and `POST /regulations/{id}/scenario-estimate` return `calibrated: false` with `data_quality_notes` until 30 historical actuals + backtest MAPE ≤ 0.25.

### Auth & pilot hardening

- Provisioned bank roles + invite flow (`POST /auth/invite`); public registration disabled in `pilot`/`production`.
- Legal-entity scoped authorization: users only see their bank's scope (memberships/scopes).
- Runtime profile validation at startup (`backend/app/config_profiles.py`): pilot refuses default `SECRET_KEY` (< 32 chars), `COOKIE_SECURE=false`, or wildcard/empty `ALLOWED_ORIGINS`.
- HttpOnly access + refresh cookies, refresh rotation, `GET /auth/me` session check.

### Desktop UI (Electron + React + Vite + Tailwind)

Pages: Dashboard, Regulations, Regulation Detail (obligation review), Digital Twin (calibrated/uncalibrated badge, seed, input snapshot), MAP Tasks (Kanban board), MAP Review (plan diff), Evidence (assess/approve), Reports (snapshot history), Users (provisioning), Settings, redesigned Login.
Shared chrome: collapsible Sidebar with custom logo asset, Header with profile dropdown, `Cmd/Ctrl+K` command palette, `Cmd/Ctrl+B` sidebar toggle, toasts, dependency-graph visualization.

---

## Tech Stack

- **Frontend:** React 19, Vite, TailwindCSS, Electron desktop app, Playwright (e2e)
- **Backend:** FastAPI, SQLAlchemy (async), Alembic, Pydantic, LangGraph, Dramatiq + Redis
- **Databases:** PostgreSQL, Qdrant (vectors), Neo4j (knowledge graph), Redis (job broker)
- **Storage:** MinIO (PDFs/artifacts), Tantivy (local BM25 index, persisted via `tantivy_data` volume)
- **Models:** Ollama (local, host-side) — defaults from `.env`: `minimax-m3:cloud` (chat/rerank), `qwen3-embedding:0.6b` (embeddings)
- **Search:** Tantivy (BM25) + Ollama embeddings + LLM reranker (30s timeout)
- **Package Manager:** uv (Python), npm (Node)

---

## Development Setup

### 1. Clone and Configure

```bash
git clone https://github.com/SaptanshuWanjari/IDEA-Lab
cd IDEA-Lab
cp .env.example .env
```

Edit `.env` and change `SECRET_KEY` for any non-local use. `.env` is the single source of truth for Ollama model names (consumed by both backend and `Makefile`).

### 1a. Pilot Runtime Profile

Validated at startup (`validate_runtime_settings` in `backend/app/config_profiles.py`, wired into `backend/app/main.py`):

| `ENVIRONMENT`          | Public registration | Secure cookies                | Secrets                                                                          | CORS origins                                     |
| ---------------------- | ------------------- | ----------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| `development` / `test` | allowed             | not required                  | defaults allowed                                                                 | defaults allowed                                 |
| `pilot` / `production` | disabled            | `COOKIE_SECURE=true` required | non-default `SECRET_KEY` (min 32 chars, injected via secret management) required | explicit non-`*` `ALLOWED_ORIGINS` list required |

For pilot deployments, keep data services (Postgres/Qdrant/Neo4j/MinIO/Redis) on the private compose network only (no published data ports — see `docker-compose.yml` note about a `docker-compose.pilot.yml` overlay) and set `ENVIRONMENT=pilot`, `COOKIE_SECURE=true`, `ALLOWED_ORIGINS=https://<pilot-host>`, plus an injected `SECRET_KEY`.

### 1b. Pilot Evaluation and Scenario Estimates

```bash
curl -X POST http://localhost:8000/regulations/evaluate -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"predictions":[],"gold_set":[]}'
```

Timeline outputs are **Implementation Scenario Estimates**, never forecasts. `GET /regulations/$REG/simulate?seed=17` and `POST /regulations/$REG/scenario-estimate` return `calibrated: false` with `data_quality_notes` (including "missing historical actuals") until the calibration gate passes. The UI shows the Calibrated/Uncalibrated badge, notes, seed, and input snapshot ID.

### 2. Install Ollama (Local)

Ollama runs on the host, not in Docker. Install it from [ollama.com](https://ollama.com), then start it:

```bash
ollama serve
```

**Important for Docker on Linux:** Ollama binds to `127.0.0.1` by default. Docker containers cannot reach `host.docker.internal:11434` unless Ollama listens on all interfaces:

```bash
OLLAMA_HOST=0.0.0.0 ollama serve
```

This allows the API container to reach Ollama at `host.docker.internal:11434`.

### 3. Start Infrastructure

```bash
make setup
```

This starts:

- Postgres (`localhost:5432`)
- Qdrant (`localhost:6333`)
- Neo4j (`localhost:7474`, `localhost:7687`)
- MinIO (`localhost:9000`, console `localhost:9001`)
- Redis (`localhost:6379`)
- Worker (Dramatiq, `pravah` queue)
- API (`localhost:8000`)

All services have Docker healthchecks, and the API/worker wait for dependencies to be healthy. The API seeds the bank-demo dataset on startup (`app/seed.py`) and ensures the Neo4j schema.

### 4. Start Desktop App

The UI is an Electron desktop application built with React and Vite.

```bash
cd frontend
npm install
npm run dev:desktop
```

Web-only Vite dev: `npm run dev`. E2E tests: `npm run test:e2e` (Playwright, via `./test-e2e.sh` from repo root).

### 5. Pull Ollama Models

The Makefile reads model names from `.env`, falling back to `qwen3:8b` / `nomic-embed-text` when `.env` is absent. The committed `.env.example` defaults are:

```bash
# Pulls OLLAMA_CHAT_MODEL + OLLAMA_EMBEDDING_MODEL from .env
make models

# Or override
make models MODEL_CHAT=llama3.1 MODEL_EMBED=qwen3-embedding:0.6b
```

Equivalently:

```bash
ollama pull minimax-m3:cloud
ollama pull qwen3-embedding:0.6b
```

Configurable via `.env`:

```text
OLLAMA_CHAT_MODEL=minimax-m3:cloud
OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b
OLLAMA_RERANK_MODEL=minimax-m3:cloud
```

### Document Ingestion Requirements

- **pdfplumber** (installed via `uv sync`) — primary text/table extraction
- **Optional OCR** — for scanned/image-based PDFs:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install tesseract-ocr poppler-utils
  # macOS
  brew install tesseract poppler
  # Then enable:
  ENABLE_OCR=true
  ```

The pipeline automatically detects low-text-yield pages and applies OCR when enabled.

### 6. Verify Services

```bash
curl http://localhost:8000/health
# Expected: {"status":"ok"}

make health   # API / Qdrant / MinIO / Ollama
make smoke    # Neo4j + Ollama embed/chat from inside the api container
```

### 7. Run Tests

```bash
make test        # cd backend && uv run pytest -v
make test-e2e    # boots infra via test-e2e.sh, runs Playwright, tears down
```

To run DB tests against Supabase:

```bash
export TEST_DATABASE_URL="postgresql+asyncpg://postgres:<password>@db.<project>.supabase.co:5432/postgres"
cd backend && uv run pytest tests/test_auth.py -v
```

### 8. Demo Data

The API auto-seeds a bank-demo dataset on startup (`backend/seed/bank-demo/`: regulations, policies, MAPs, evidence manifests). For bulk mock data (10 RBI-style regulations, ~150 MAPs, 12 users, 40 evidence PDFs), see `backend/seed/`. Legacy helper: `python scripts/seed_demo.py --pdf sample.pdf`.

---

## Project Layout

```text
IDEA-Lab/
├── backend/
│   ├── app/
│   │   ├── agents/          # LangGraph pipeline nodes, prompts, tools
│   │   ├── graph/           # Neo4j client + schema
│   │   ├── llm/             # LLM + embedding clients
│   │   ├── models/          # SQLAlchemy models (users, roles, scopes, memberships,
│   │   │                    #   regulations, versions, jobs, obligations, maps,
│   │   │                    #   plans, evidence, assessments, ai_runs, snapshots, audit)
│   │   ├── routers/         # FastAPI routes: auth, regulations, maps, reports
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic (retrieval, ingestion, workflow,
│   │   │                    #   evaluation, scenario_estimator, report_snapshot, ...)
│   │   ├── config.py / config_profiles.py
│   │   ├── workers.py       # Dramatiq background jobs (broker-optional)
│   │   └── seed.py
│   ├── seed/bank-demo/      # Demo regulations, policies, maps, evidence
│   ├── alembic/versions/    # Migrations (scopes, artifacts, jobs, obligations, plans, ...)
│   ├── tests/
│   ├── pyproject.toml
│   └── requirements.txt     # generated from pyproject.toml via `uv export`
├── frontend/                # Electron desktop app (React + Vite + Tailwind)
│   ├── electron/            # Electron main process
│   ├── src/
│   │   ├── pages/           # Dashboard, Regulations, RegulationDetail, DigitalTwin,
│   │   │                    #   MapTasks (kanban), MapReview, Evidence, Reports,
│   │   │                    #   Users, Settings, Login
│   │   ├── components/      # Sidebar, Header, CommandPalette, DependencyGraph, ...
│   │   ├── lib/ hooks/ data/
│   │   └── logo.svg
│   └── tests/e2e/           # Playwright tests
├── scripts/
│   └── seed_demo.py         # Legacy demo seeder
├── docker-compose.yml
├── Makefile
├── .env.example
└── test-e2e.sh
```

Note: `docs/` is gitignored (local-only design notes, evaluations, and the pilot evaluation protocol).

---

## Common Commands

| Command                                                 | Purpose                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `make setup` / `make up`                                | Start all Docker services                                                     |
| `make down`                                             | Stop all services                                                             |
| `make logs`                                             | Tail Docker logs                                                              |
| `make health`                                           | Check API/Qdrant/MinIO/Ollama health                                          |
| `make smoke`                                            | Neo4j + Ollama embed/chat checks from api container                           |
| `make models`                                           | Pull Ollama models from `.env` (override with `MODEL_CHAT=` / `MODEL_EMBED=`) |
| `make test`                                             | Run backend tests                                                             |
| `make test-e2e`                                         | Run Playwright e2e via `test-e2e.sh`                                          |
| `make shell-api`                                        | Bash into the API container                                                   |
| `cd backend && uv run pytest tests/test_reranker.py -v` | Run one test file                                                             |
| `python scripts/seed_demo.py --pdf sample.pdf`          | Legacy seed: demo user + upload/regulation                                    |

---

## Quick Smoke Test

After `make setup` and pulling models:

```bash
# Register (disabled in pilot/production — use /auth/invite there)
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pravah.in","password":"admin123","role":"compliance_officer"}' \
  -c cookies.txt

# Upload a regulation (creates async ingest job)
curl -X POST http://localhost:8000/regulations/ \
  -b cookies.txt \
  -F "title=Sample RBI Circular" \
  -F "file=@/path/to/circular.pdf"

# Capture regulation id as $REG, then generate MAPs
curl -X POST "http://localhost:8000/regulations/$REG/generate" -b cookies.txt

# Obligations + review, plans, evidence, report
curl "http://localhost:8000/regulations/$REG/obligations" -b cookies.txt
curl "http://localhost:8000/regulations/$REG/graph" -b cookies.txt
curl "http://localhost:8000/regulations/$REG/simulate?seed=17" -b cookies.txt
curl -X POST "http://localhost:8000/regulations/$REG/scenario-estimate" -b cookies.txt \
  -H "Content-Type: application/json" -d '{}'
curl "http://localhost:8000/reports/$REG/report" -b cookies.txt
```

---

## Testing with AI

The platform is designed to be tested alongside an LLM. Useful prompts:

- **Generate synthetic RBI circulars** for upload tests.
- **Generate expected MAPs** from extracted clauses and compare to `/generate` output.
- **Validate dependency graphs** against `/regulations/{id}/graph`.
- **Judge retrieval quality** against `RetrievalService.search` results.
- **Audit compliance reports** for missing evidence or uncovered clauses.

---

## Notes

- Do not commit `.env` or database credentials. `docs/` is gitignored — don't rely on it for onboarding.
- The backend defaults to local services; override with environment variables.
- `requirements.txt` is generated from `pyproject.toml` via `uv export`.
- The reranker is LLM-based and intentionally synchronous in the MVP; latency is bounded by a 30s timeout.
- `cookies.txt` is gitignored; auth uses HttpOnly cookies, not bearer tokens.
