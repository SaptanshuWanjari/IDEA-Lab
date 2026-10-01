"""Idempotent seeder for the Pravah Demo Bank dataset.

Seeds users + regulations via the live FastAPI backend:

1. register/login each user in backend/seed/bank-demo/bank.json
   (skip if 400 already registered -> login instead)
2. list GET /regulations/ to skip existing titles
3. POST /regulations/ multipart PDF upload + title
4. POST /regulations/{id}/ingest
5. MAPs from backend/seed/bank-demo/maps.json:
   POST /regulations/{id}/generate (best-effort; LLM may be unavailable),
   then converge existing MAPs toward fixture states matched by
   description (idempotent): POST /maps/{id}/review {action} and
   POST /maps/{id}/complete multipart evidence upload.

Usage:
    python3 scripts/seed_bank_demo.py --dry-run
    python3 scripts/seed_bank_demo.py --base-url http://localhost:8000
    python3 scripts/seed_bank_demo.py --verify   # live API checks (Task 7)
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - import httpx lazily so --dry-run needs no deps
    import httpx

DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_PASSWORD = "Demobank@123"

SEED_DIR = pathlib.Path(__file__).resolve().parent.parent / "backend" / "seed" / "bank-demo"

REGULATION_TITLES = {
    "kyc-aml-2026": "RBI KYC/AML Directions 2026",
    "cyber-controls-2026": "RBI Cyber Security Controls 2026",
    "op-resilience-2026": "RBI Operational Resilience Framework 2026",
    "aml-cft-2026": "RBI AML/CFT Directions 2026",
    "it-outsourcing-2026": "RBI IT Outsourcing Directions 2026",
    "fraud-risk-2026": "RBI Fraud Risk Management Directions 2026",
    "credit-risk-2026": "RBI Credit Risk and Large Exposures Directions 2026",
    "msme-lending-2026": "RBI MSME Lending Directions 2026",
    "business-continuity-2026": "RBI Business Continuity Management Directions 2026",
    "data-privacy-2026": "RBI Customer Data Privacy Directions 2026",
}


def load_seed():
    bank = json.loads((SEED_DIR / "bank.json").read_text())
    manifest = json.loads((SEED_DIR / "bank-demo.json").read_text())
    return bank, manifest


def reg_title(slug: str) -> str:
    return REGULATION_TITLES.get(slug, slug.replace("-", " ").title())


def ensure_user(client: "httpx.Client", base_url: str, email: str, role: str, password: str) -> str:
    """Register a user, falling back to login if already registered. Returns action taken."""
    resp = client.post(
        f"{base_url}/auth/register",
        json={"email": email, "password": password, "role": role},
    )
    if resp.status_code in (200, 201):
        return "created"
    if resp.status_code == 400 and "already registered" in resp.text.lower():
        login = client.post(
            f"{base_url}/auth/login",
            json={"email": email, "password": password},
        )
        login.raise_for_status()
        return "exists-login-ok"
    resp.raise_for_status()
    return "created"


def match_regulation_id(regs: list[dict], slug: str) -> str | None:
    """Match a seed slug to a live regulation id without relying on exact title.

    POST /regulations/{id}/ingest rewrites regulation.title to the parsed doc
    title, so hardcoded REGULATION_TITLES no longer match. RegulationOut keeps
    source_pdf_url (bucket/key containing the original filename), which is
    stable: match if the slug/filename appears in source_pdf_url, falling back
    to a title-contains match for regs uploaded before the fix.
    """
    needle = slug.lower()
    for r in regs:
        url = (r.get("source_pdf_url") or "").lower()
        if needle and needle in url:
            return r.get("id")
    expected = reg_title(slug).lower()
    slug_words = slug.lower().replace("-", " ")
    for r in regs:
        actual = (r.get("title") or "").lower()
        if not actual:
            continue
        if expected in actual or actual in expected or slug_words in actual:
            return r.get("id")
    return None


def seed_regulation(client: "httpx.Client", base_url: str, slug: str) -> tuple[str, str | None]:
    """Upload + ingest one regulation PDF. Returns (action taken, regulation id)."""
    existing = client.get(f"{base_url}/regulations/")
    existing.raise_for_status()
    matched = match_regulation_id(existing.json(), slug)
    if matched is not None:
        return f"skip (already seeded: {slug} id={matched})", matched
    title = reg_title(slug)
    pdf_path = SEED_DIR / "regulations" / f"{slug}.pdf"
    with open(pdf_path, "rb") as f:
        resp = client.post(
            f"{base_url}/regulations/",
            data={"title": title},
            files={"file": (pdf_path.name, f, "application/pdf")},
        )
    resp.raise_for_status()
    reg_id = resp.json()["id"]
    ingest = client.post(f"{base_url}/regulations/{reg_id}/ingest")
    ingest.raise_for_status()
    return f"created+ingested (id={reg_id})", reg_id


def load_map_fixtures() -> list[dict]:
    return json.loads((SEED_DIR / "maps.json").read_text())


def resolve_regulation_id(client: "httpx.Client", base_url: str, slug: str) -> str | None:
    """Map a seed slug to a live regulation id via source_pdf_url match. Returns None if missing."""
    resp = client.get(f"{base_url}/regulations/")
    resp.raise_for_status()
    return match_regulation_id(resp.json(), slug)


def try_generate_maps(client: "httpx.Client", base_url: str, reg_id: str) -> str:
    """Best-effort POST /regulations/{id}/generate. LLM may be unavailable — never raises."""
    try:
        resp = client.post(f"{base_url}/regulations/{reg_id}/generate")
        resp.raise_for_status()
        return f"generate ok ({len(resp.json())} MAPs)"
    except Exception as e:  # noqa: BLE001 - generate needs LLM; fall back to existing MAPs
        return f"generate skipped/failed (LLM may be unavailable): {e}"


def review_map(client: "httpx.Client", base_url: str, map_id: str, action: str) -> None:
    """POST /maps/{id}/review with JSON body {"action": ...} (approve/reject)."""
    resp = client.post(f"{base_url}/maps/{map_id}/review", json={"action": action})
    resp.raise_for_status()


def complete_map(client: "httpx.Client", base_url: str, map_id: str, evidence_path: pathlib.Path) -> None:
    """POST /maps/{id}/complete with multipart evidence file upload."""
    with open(evidence_path, "rb") as f:
        resp = client.post(
            f"{base_url}/maps/{map_id}/complete",
            files={"file": (evidence_path.name, f, "application/pdf")},
        )
    resp.raise_for_status()


def seed_maps_for_regulation(
    client: "httpx.Client",
    base_url: str,
    slug: str,
    fixtures: list[dict],
    reg_id: str | None = None,
) -> None:
    """Converge live MAPs toward fixture states for one regulation (idempotent).

    Matches by description (GET /maps/?regulation_id=). Fixture-only keys
    (reg, clause, evidence_file) are never sent to the API — only description
    matching, review actions, and evidence uploads use them locally.
    NOTE: backend has no POST /maps/ create route (maps.py only exposes
    list/detail/review/complete), so fixtures with no description match cannot
    be created here — they need POST /regulations/{id}/generate with an LLM.
    """
    if reg_id is None:
        reg_id = resolve_regulation_id(client, base_url, slug)
    if reg_id is None:
        print(f"maps {slug}: skip (regulation not seeded yet)")
        return
    print(f"maps {slug}: {try_generate_maps(client, base_url, reg_id)}")

    existing = client.get(f"{base_url}/maps/", params={"regulation_id": reg_id})
    existing.raise_for_status()
    by_description = {m.get("description"): m for m in existing.json()}

    for fx in [f for f in fixtures if f.get("reg") == slug]:
        desc = fx["description"]
        live = by_description.get(desc)
        if live is None:
            print(f"  - missing (no POST /maps create route; needs /generate): {desc[:60]!r}")
            continue
        map_id = live["id"]
        try:
            want_approval = fx.get("approval_state", "Draft")
            if want_approval == "Approved" and live.get("approval_state") != "Approved":
                review_map(client, base_url, map_id, "approve")
                print(f"  - approved: {desc[:60]!r}")
            elif want_approval == "Rejected" and live.get("approval_state") != "Rejected":
                review_map(client, base_url, map_id, "reject")
                print(f"  - rejected: {desc[:60]!r}")
            elif live.get("approval_state") == want_approval:
                print(f"  - skip (approval_state already {want_approval}): {desc[:60]!r}")
            if fx.get("status") == "Completed" and live.get("status") != "Completed":
                evidence_rel = fx.get("evidence_file")
                if not evidence_rel:
                    print(f"  - cannot complete (no evidence_file fixture): {desc[:60]!r}")
                    continue
                evidence_path = SEED_DIR / evidence_rel
                if not evidence_path.exists():
                    print(f"  - cannot complete (missing file {evidence_rel}): {desc[:60]!r}")
                    continue
                if live.get("approval_state") != "Approved" and want_approval == "Approved":
                    review_map(client, base_url, map_id, "approve")
                complete_map(client, base_url, map_id, evidence_path)
                print(f"  - completed + evidence: {desc[:60]!r}")
            elif fx.get("status") == "Completed":
                print(f"  - skip (status already Completed): {desc[:60]!r}")
        except Exception as e:  # noqa: BLE001 - report per-MAP and continue
            print(f"  - ERROR {desc[:60]!r}: {e}")


def seed_all_maps(
    client: "httpx.Client", base_url: str, fixtures: list[dict], reg_ids: dict[str, str] | None = None
) -> None:
    # Review actions require compliance_officer/admin; ensure admin session for this phase.
    try:
        client.post(
            f"{base_url}/auth/login",
            json={"email": "admin@demobank.in", "password": DEFAULT_PASSWORD},
        ).raise_for_status()
    except Exception as e:  # noqa: BLE001 - reviews may 403 without admin; per-MAP errors report it
        print(f"maps: WARNING admin login failed ({e}); review calls may be forbidden")
    slugs = sorted({f.get("reg") for f in fixtures if f.get("reg")})
    for slug in slugs:
        try:
            seed_maps_for_regulation(
                client, base_url, slug, fixtures, reg_id=(reg_ids or {}).get(slug)
            )
        except Exception as e:  # noqa: BLE001 - report per regulation and continue
            print(f"maps {slug}: ERROR {e}")


def verify_bank_demo(client: "httpx.Client", base_url: str) -> int:
    """Run live verification checks against the seeded backend.

    Checks: GET /regulations/ count==3, per-reg graph nodes>0,
    per-reg simulate has median_completion_days key,
    per-reg report has completed_count/total_count keys.
    Prints VERIFY OK or explicit FAIL lines. Returns process exit code.
    """
    failures: list[str] = []
    try:
        login = client.post(
            f"{base_url}/auth/login",
            json={"email": "admin@demobank.in", "password": DEFAULT_PASSWORD},
        )
        login.raise_for_status()
    except Exception as e:  # noqa: BLE001 - login failure fails every check below
        print(f"FAIL: admin login failed: {e}")
        return 1

    try:
        resp = client.get(f"{base_url}/regulations/")
        resp.raise_for_status()
        regs = resp.json()
    except Exception as e:  # noqa: BLE001 - report and exit non-zero
        print(f"FAIL: GET /regulations/ failed: {e}")
        return 1
    if not isinstance(regs, list):
        print(f"FAIL: GET /regulations/ returned non-list: {type(regs).__name__}")
        return 1
    if len(regs) != len(load_seed()[1].get("regulations", [])):
        print(f"FAIL: GET /regulations/ count={len(regs)}, expected {len(load_seed()[1].get('regulations', []))}")
        return 1

    total_maps = 0
    for reg in regs:
        reg_id = reg.get("id")
        title = reg.get("title", reg_id)
        try:
            g = client.get(f"{base_url}/regulations/{reg_id}/graph")
            g.raise_for_status()
            nodes = g.json().get("nodes")
            if not isinstance(nodes, list) or len(nodes) == 0:
                failures.append(f"FAIL: graph nodes empty for {title!r} (id={reg_id})")
            else:
                total_maps += len(nodes)
        except Exception as e:  # noqa: BLE001 - per-reg failure, continue
            failures.append(f"FAIL: GET /regulations/{reg_id}/graph failed: {e}")
        try:
            s = client.get(f"{base_url}/regulations/{reg_id}/simulate")
            s.raise_for_status()
            if "median_completion_days" not in s.json():
                failures.append(f"FAIL: simulate missing median_completion_days for {title!r} (id={reg_id})")
        except Exception as e:  # noqa: BLE001 - per-reg failure, continue
            failures.append(f"FAIL: GET /regulations/{reg_id}/simulate failed: {e}")
        try:
            r = client.get(f"{base_url}/reports/{reg_id}/report")
            r.raise_for_status()
            body = r.json()
            if "completed_count" not in body or "total_count" not in body:
                failures.append(f"FAIL: report missing completed_count/total_count for {title!r} (id={reg_id})")
        except Exception as e:  # noqa: BLE001 - per-reg failure, continue
            failures.append(f"FAIL: GET /reports/{reg_id}/report failed: {e}")

    if failures:
        for line in failures:
            print(line)
        return 1
    print(f"VERIFY OK: {len(regs)} regs, {total_maps} maps, reports ok")
    return 0


def dry_run_plan(bank: dict, manifest: dict) -> None:
    from collections import Counter as _Counter

    fixtures = load_map_fixtures()
    print(f"DRY-RUN plan against seed dir: {SEED_DIR}")
    print(f"Bank: {bank.get('name')} departments={bank.get('departments')}")
    print("Users to ensure (register, or login if 400 already registered):")
    for u in bank.get("users", []):
        print(f"  - {u['email']} role={u['role']} dept={u.get('dept')}")
    print("Regulations to upload (skip if title exists via GET /regulations/):")
    for slug in manifest.get("regulations", []):
        print(f"  - {slug}: title={reg_title(slug)!r} pdf=regulations/{slug}.pdf + POST /ingest")
    counts = _Counter((f.get("reg"), f.get("status")) for f in fixtures)
    print(f"MAPs to converge ({len(fixtures)} fixtures, matched by description via GET /maps/?regulation_id=):")
    for (reg, status), n in sorted(counts.items()):
        print(f"  - {reg} status={status}: {n}")
    print("  generate: POST /regulations/{id}/generate first (best-effort, LLM may fail);")
    print("  reviews: POST /maps/{id}/review {action: approve|reject};")
    print("  evidence: POST /maps/{id}/complete multipart for Completed fixtures.")
    print("DRY-RUN complete: no API calls made.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed Pravah Demo Bank dataset (idempotent).")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--reset", action="store_true", help="Reset demo data first (no-op in Task 5).")
    parser.add_argument("--dry-run", action="store_true", help="Print planned actions, make no API calls.")
    parser.add_argument("--verify", action="store_true", help="Verify seeded data via live API checks.")
    args = parser.parse_args(argv)

    if args.verify and not args.dry_run:
        base_url = args.base_url.rstrip("/")
        try:
            import httpx  # lazy: --dry-run works with plain python3, no deps
        except ImportError:
            print("FAIL: --verify needs the 'httpx' package (e.g. backend venv / uv run). No checks ran.")
            return 1

        with httpx.Client(base_url=base_url, follow_redirects=True, timeout=60.0) as client:
            return verify_bank_demo(client, base_url)

    if args.verify and args.dry_run:
        _manifest = load_seed()[1]
        print(f"DRY-RUN: --verify would check {len(_manifest.get('regulations', []))} regs (graph nodes>0, simulate median, report counts); no API calls made.")
        return 0

    bank, manifest = load_seed()

    if args.reset:
        print("NOTE: --reset is a no-op in Task 5 (full reset support later). Continuing.")

    if args.dry_run:
        dry_run_plan(bank, manifest)
        return 0

    base_url = args.base_url.rstrip("/")
    import httpx  # lazy: --dry-run/--verify work with plain python3, no deps

    # httpx.Client keeps cookies (session via httpx cookies) across register/login calls.
    # In-run id map: upload returns the id, so reuse it directly for MAP seeding
    # instead of re-resolving via GET /regulations/ (titles are rewritten by /ingest).
    reg_ids: dict[str, str] = {}
    with httpx.Client(base_url=base_url, follow_redirects=True, timeout=60.0) as client:
        for u in bank.get("users", []):
            try:
                action = ensure_user(client, base_url, u["email"], u["role"], DEFAULT_PASSWORD)
            except Exception as e:  # noqa: BLE001 - report and continue per user
                print(f"user {u['email']}: ERROR {e}", file=sys.stderr)
                continue
            print(f"user {u['email']}: {action}")
        for slug in manifest.get("regulations", []):
            try:
                action, reg_id = seed_regulation(client, base_url, slug)
                if reg_id is not None:
                    reg_ids[slug] = reg_id
            except Exception as e:  # noqa: BLE001 - report and continue per regulation
                print(f"regulation {slug}: ERROR {e}", file=sys.stderr)
                continue
            print(f"regulation {slug}: {action}")
        seed_all_maps(client, base_url, load_map_fixtures(), reg_ids=reg_ids)
    print("Seed complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
