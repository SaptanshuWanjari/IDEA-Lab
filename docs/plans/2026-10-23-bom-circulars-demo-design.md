# End-to-End Demo: Bank of Maharashtra Circulars Compliance Lifecycle

**Date:** 2026-10-23  
**Status:** Approved  
**Author:** Saptanshu Wanjari

---

## Overview

Demonstrate the full PravahOS compliance lifecycle using **3 real RBI circulars** (from `docs/`) as regulations and **Bank of Maharashtra-style internal policies** as the bank's original compliance framework.

**Circulars:**
1. `Circular.pdf` — NRD-CSR (Non-Resident Deposits) submission via CIMS Sankalan Portal
2. `circular2.pdf` — Foreign Exchange Risk Reserve (FERR) under Risk Management
3. `circular3.pdf` — FX Derivatives position limits & rebooking rules

**Flow:** Upload → Ingest → Generate MAPs → Review Obligations → MAP Plans → Evidence → Reports → Simulation

---

## Data Preparation

### 3 New Regulations

| PDF File | Regulation Slug | Title |
|----------|-----------------|-------|
| `docs/Circular.pdf` | `nrd-csr-2026` | Non-Resident Deposits - NRD-CSR Submission via CIMS Sankalan |
| `docs/circular2.pdf` | `ferr-2026` | Foreign Exchange Risk Reserve under Risk Management |
| `docs/circular3.pdf` | `fx-derivatives-2026` | Risk Management and Inter-Bank Dealings: FX Derivatives |

### 3 Internal Policies (Bank of Maharashtra style)

Created in `backend/seed/bank-demo/policies/`:

| Policy File | ID | Linked Regulation | Owner Dept | Version |
|-------------|-----|-------------------|------------|---------|
| `nrd-csr-policy.md` | `pol-nrd-01` | `nrd-csr-2026` | Treasury | v1.0 |
| `ferr-policy.md` | `pol-ferr-01` | `ferr-2026` | Risk | v1.0 |
| `fx-derivatives-policy.md` | `pol-fxderiv-01` | `fx-derivatives-2026` | Treasury | v1.0 |

Each policy includes:
- Frontmatter with `id`, `linked_regulation`, `owner_dept`, `version`
- Procedure table mapping steps to circular clauses
- Evidence checklist

---

## Manifest Integration

**Updated `backend/seed/bank-demo/bank-demo.json`:**

```json
{
  "bank": "bank.json",
  "policies": [
    // ... existing 6 policies ...
    {
      "file": "policies/nrd-csr-policy.md",
      "id": "pol-nrd-01",
      "linked_regulation": "nrd-csr-2026",
      "owner_dept": "Treasury",
      "version": "v1.0"
    },
    {
      "file": "policies/ferr-policy.md",
      "id": "pol-ferr-01",
      "linked_regulation": "ferr-2026",
      "owner_dept": "Risk",
      "version": "v1.0"
    },
    {
      "file": "policies/fx-derivatives-policy.md",
      "id": "pol-fxderiv-01",
      "linked_regulation": "fx-derivatives-2026",
      "owner_dept": "Treasury",
      "version": "v1.0"
    }
  ],
  "regulations": [
    // ... existing 11 ...
    "nrd-csr-2026",
    "ferr-2026",
    "fx-derivatives-2026"
  ]
}
```

**Frontend:** `getPoliciesForReg()` in `bankDemoManifest.ts` uses fuzzy matching on `linked_regulation` — automatically links new policies in Regulation Detail page's policy drawer.

---

## Demo Script: `scripts/demo_bom_circulars.py`

**Modeled after `seed_bank_demo.py`** — idempotent, graceful degradation.

### Per-Regulation Flow

```python
for each circular in [nrd-csr-2026, ferr-2026, fx-derivatives-2026]:
    1. Upload PDF → POST /regulations/ (multipart)
    2. Ingest → POST /regulations/{id}/ingest
    3. Generate MAPs → POST /regulations/{id}/generate
    4. List obligations → GET /regulations/{id}/obligations
    5. Approve obligations → POST /maps/{id}/review {action: approve}
    6. Complete MAPs with evidence → POST /maps/{id}/complete (multipart)  # skipped for new regs
    7. Generate report snapshot → POST /maps/snapshots
    8. Verify → GET /regulations/{id}/simulate, GET /reports/{id}/report
```

### Key Features

- **Idempotent**: Skips already-uploaded regulations via `content_hash` deduplication
- **Session**: Uses `admin@demobank.in` (compliance_officer role)
- **LLM resilience**: If `generate` fails (Ollama unavailable), logs warning and continues
- **Summary output**: Prints table with MAP counts, statuses, simulation results

### Evidence Handling

- No pre-seeded evidence PDFs for the 3 new regulations
- MAPs left in "Approved"/"Pending" state
- Reports show `completed_count=0` for these 3 (expected)

---

## Verification & Acceptance Criteria

### Automated Checks (script)

| Check | Expected Result |
|-------|-----------------|
| `GET /regulations/` | 14 total (11 existing + 3 new) |
| Each new regulation `status` | "Ingested" |
| Each new regulation `clause_count` | > 0 |
| `POST /regulations/{id}/generate` | Creates ≥ 1 MAP |
| Obligation approve | Maker-checker enforced |
| `GET /regulations/{id}/graph` | Nodes > 0 |
| `GET /regulations/{id}/simulate` | Returns `median_completion_days` |
| `GET /reports/{id}/report` | Returns `completed_count`, `total_count` |

### Manual UI Verification

- Regulation Detail page shows: clauses, MAPs, dependency graph, policy drawer
- Policy drawer displays linked BoM-style policy
- Digital Twin shows calibrated/uncalibrated badge with seed
- Reports page shows snapshot history

### Acceptance Criteria

1. All 3 circulars uploaded and ingested without errors
2. MAPs generated for all 3 (LLM failure handled gracefully)
3. At least 1 obligation approved per regulation
4. Report snapshots created for all 3
5. Simulation endpoint returns valid estimates (`calibrated: false`)
6. UI Regulation Detail page fully functional for all 3

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Duplicate upload | Skip (content_hash match) |
| LLM unavailable | Warning log, continue with existing MAPs |
| Network/API error | Print error, continue to next regulation |
| Maker-checker violation | Script uses admin session (different from creator) |

---

## Files to Create/Modify

### New Files
- `backend/seed/bank-demo/policies/nrd-csr-policy.md`
- `backend/seed/bank-demo/policies/ferr-policy.md`
- `backend/seed/bank-demo/policies/fx-derivatives-policy.md`
- `scripts/demo_bom_circulars.py`

### Modified Files
- `backend/seed/bank-demo/bank-demo.json` (add 3 regulations + 3 policies)
- `backend/seed/bank-demo/README.md` (update regulation/policy counts)

---

## Out of Scope

- Scraping BoM website policies (manual policy creation based on circular requirements)
- Evidence PDFs for new regulations (placeholder only)
- Calibration of scenario estimates (requires 30+ historical actuals)
- Production hardening (pilot mode already enforced)