# In-App Demo Mode: BoM Circulars Compliance Pipeline

**Date:** 2026-10-24  
**Status:** Approved  
**Author:** Saptanshu Wanjari

---

## Overview

Add a **"🎬 Demo" button in the navbar** that opens a modal and runs the full compliance pipeline for 3 RBI circulars (NRD-CSR, FERR, FX Derivatives) with live progress, using local LLM models. Designed for a 3-5 minute live presentation in the Electron app.

---

## User Flow

1. **User clicks "🎬 Demo" in navbar** → Modal opens
2. **Auto-starts** sequential processing of 3 circulars
3. **Live progress** per circular: Upload → Ingest → Generate MAPs
4. **Policy drawer auto-opens** after each circular's MAP generation
5. **User walks through UI** at completion: Regulations → Detail → MAP Tasks → Reports

---

## UI Design

### Navbar Button (`Header.tsx`)
- Location: Far right, next to profile dropdown
- Icon: 🎬 (film/clapperboard)
- Tooltip: "Run BoM Circulars Demo"

### Demo Modal (`DemoModal.tsx`)
```
┌─────────────────────────────────────────┐
│  🎬 BoM Circulars Demo          [✕]     │
│  ─────────────────────────────────────  │
│  ▶ nrd-csr-2026      [████████░░] 45s   │
│     ✓ Upload (2s)  ✓ Ingest (8s)        │
│     ◐ Generate MAPs... (35s)            │
│                                         │
│  ⏳ ferr-2026        [░░░░░░░░░░] --    │
│     ○ Upload        ○ Ingest            │
│     ○ Generate                          │
│                                         │
│  ⏳ fx-derivatives   [░░░░░░░░░░] --    │
│     ○ Upload        ○ Ingest            │
│     ○ Generate                          │
│  ─────────────────────────────────────  │
│  [Pause] [Stop]  Elapsed: 1m 23s       │
└─────────────────────────────────────────┘
```

**Progress States:**
- `○` = pending
- `◐` = in progress (spinner)
- `✓` = complete (green)
- `✗` = error (red)

---

## Circular Pipeline (Per Regulation)

| Step | API Call | Est. Time | UI Label |
|------|----------|-----------|----------|
| 1. Upload | `POST /regulations/` (multipart) | ~2-3s | "Uploading PDF..." |
| 2. Ingest | `POST /regulations/{id}/ingest` | ~8-15s | "Extracting clauses..." |
| 3. Generate | `POST /regulations/{id}/generate?demo=true` | ~30-60s | "Generating MAPs..." |
| 4. Complete | — | — | Policy drawer opens |

**Total: ~3-4 min for 3 circulars**

---

## Model Configuration

### `.env` (Demo Mode)
```env
OLLAMA_CHAT_MODEL=qwen3:8b
OLLAMA_EMBEDDING_MODEL=qwen3-embedding:0.6b
OLLAMA_RERANK_MODEL=qwen3:8b
```

### Fallback Chain (Backend)
```
Primary: qwen3:8b (5.2 GB, better quality)
Fallback: llama3.2:latest (2 GB, faster)
```
- `?demo=true` param on generate endpoint triggers fallback chain
- If primary fails/times out → auto-retry with fallback

---

## Circular-to-Policy Mapping (Pre-configured)

| Circular | Regulation Slug | Policy ID | Policy File | Department |
|----------|-----------------|-----------|-------------|------------|
| NRD-CSR | `nrd-csr-2026` | `pol-nrd-01` | `nrd-csr-policy.md` | Treasury |
| FERR | `ferr-2026` | `pol-ferr-01` | `ferr-policy.md` | Risk |
| FX Derivatives | `fx-derivatives-2026` | `pol-fxderiv-01` | `fx-derivatives-policy.md` | Treasury |

**Frontend:** `getPoliciesForReg()` in `bankDemoManifest.ts` auto-links via `linked_regulation` fuzzy match → Policy Drawer shows in Regulation Detail page.

---

## Existing Data Handling

The 3 circulars are **already uploaded** from previous runs:
- `nrd-csr-2026` → `bd04811d-adc7-4a9e-8aea-b54c989e5f6e`
- `ferr-2026` → `0d528fe1-1924-4cb3-a8cf-9502f97a6b20`
- `fx-derivatives-2026` → `1d5463aa-9c3a-4e20-8663-db1316a8383a`

**Demo behavior:**
- Detect existing → skip upload, run ingest+generate
- Modal checkbox: "Force re-upload" (deletes & re-uploads fresh)

---

## User Session

**Demo user:** `admin@pravah.in` (dev admin, auto-seeded on startup)
- Role: `compliance_officer`
- No login required if already authenticated

---

## Files to Create/Modify

### New Files
- `frontend/src/components/DemoModal.tsx` — Demo modal with progress tracking
- `backend/app/services/demo_service.py` — Demo orchestration logic (optional)

### Modified Files
- `.env` — Local model config
- `frontend/src/components/Header.tsx` — Add Demo button
- `frontend/src/pages/RegulationsPage.tsx` — Integrate DemoModal
- `backend/app/llm/client.py` — Demo model fallback chain
- `backend/app/routers/regulations.py` — `?demo=true` param on generate

---

## Out of Scope

- Separate demo script (user wants in-app only)
- Deleting regulations after demo (keep for repeat runs)
- Parallel processing (sequential for clear presentation)
- Custom demo user (uses existing admin)