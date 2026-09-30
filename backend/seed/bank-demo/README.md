# Bank Demo Seed Dataset

Fictional dataset for end-to-end compliance lifecycle demo: **Pravah Demo Bank**
(7 departments, 5 users).

## Layout

- `bank.json` — bank name, departments, users (seeded via `/auth/register`).
- `bank-demo.json` — manifest: bank file, 3 regulation slugs, policy entries
  linking `linked_regulation` + `owner_dept`.
- `regulations/` — 3 regulation PDFs + `clauses.json` (Task 2).
- `policies/` — internal policy markdowns with frontmatter (Task 3).
- `maps.json` + `evidence/` — MAP fixtures and dummy evidence (Task 4).

## Seeding

`python scripts/seed_bank_demo.py [--dry-run|--verify]` (Tasks 5-7).
Idempotent: re-runs skip already-registered users and existing regulations.
