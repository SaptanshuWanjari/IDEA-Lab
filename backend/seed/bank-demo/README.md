# Bank Demo Seed Dataset

Fictional dataset for end-to-end compliance lifecycle demo: **Pravah Demo Bank**
(7 departments, 13 users) — includes 3 RBI circular demo regulations.

## Layout

- `bank.json` — bank name, departments, users (seeded via `/auth/register`).
- `bank-demo.json` — manifest: bank file, 14 regulation slugs, 9 policy entries
  linking `linked_regulation` + `owner_dept`.
- `regulations/` — 14 regulation PDFs (11 demo + 3 RBI circulars) + `clauses.json`.
- `policies/` — 9 internal policy markdowns with frontmatter (6 demo + 3 BoM-style).
- `maps.json` + `evidence/` — MAP fixtures and dummy evidence (Task 4).

## Seeding

`python scripts/seed_bank_demo.py [--dry-run|--verify]` (Tasks 5-7).
Idempotent: re-runs skip already-registered users and existing regulations.

## Circular Demo

Run the end-to-end circular demo:
```bash
python scripts/demo_bom_circulars.py --base-url http://localhost:8000
```
