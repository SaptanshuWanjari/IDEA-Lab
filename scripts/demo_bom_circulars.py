#!/usr/bin/env python3
"""End-to-end demo: 3 BoM circulars -> full compliance lifecycle.

Flow per circular:
  Admin:               upload -> ingest -> generate MAPs
  Compliance officer:  approve MAPs (maker-checker: different user)
  Admin:               create plan candidate -> approve plan -> snapshot -> verify

Usage:
    python scripts/demo_bom_circulars.py --base-url http://localhost:8000
    python scripts/demo_bom_circulars.py --dry-run
"""

from __future__ import annotations

import argparse
import pathlib

DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_PASSWORD = "Demobank@123"

# Two users: admin generates, compliance officer approves (maker-checker)
ADMIN_EMAIL = "admin@demobank.in"
APPROVER_EMAIL = "compliance@demobank.in"

DOCS_DIR = pathlib.Path(__file__).resolve().parent.parent / "docs"
SEED_DIR = pathlib.Path(__file__).resolve().parent.parent / "backend" / "seed" / "bank-demo"

CIRCULARS = [
    {
        "slug": "nrd-csr-2026",
        "title": "Non-Resident Deposits - NRD-CSR Submission via CIMS Sankalan",
        "pdf": "Circular.pdf",
        "dept": "Treasury",
    },
    {
        "slug": "ferr-2026",
        "title": "Foreign Exchange Risk Reserve under Risk Management",
        "pdf": "circular2.pdf",
        "dept": "Risk",
    },
    {
        "slug": "fx-derivatives-2026",
        "title": "Risk Management and Inter-Bank Dealings: FX Derivatives",
        "pdf": "circular3.pdf",
        "dept": "Treasury",
    },
]

# Keywords to identify existing regulations by title/summary when re-running
REGULATION_TITLE_KEYWORDS = {
    "nrd-csr-2026": ["NRD", "CSR", "Non-Resident", "Sankalan"],
    "ferr-2026": ["FERR", "Foreign Exchange Risk", "Risk Reserve"],
    "fx-derivatives-2026": ["FX Derivative", "Inter-Bank", "rebooking", "rollover"],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def match_regulation_id(regs: list[dict], slug: str) -> str | None:
    """Find existing regulation by slug in PDF URL or title keywords."""
    needle = slug.lower()
    for r in regs:
        url = (r.get("source_pdf_url") or "").lower()
        if needle and needle in url:
            return r.get("id")
    keywords = REGULATION_TITLE_KEYWORDS.get(slug, [])
    for r in regs:
        actual = (r.get("title") or "").lower()
        summary = (r.get("summary") or "").lower()
        if any(kw.lower() in actual for kw in keywords) or any(kw.lower() in summary for kw in keywords):
            return r.get("id")
    return None


def upload_regulation(client, base_url: str, circ: dict) -> tuple[str, str | None]:
    slug = circ["slug"]
    existing = client.get(f"{base_url}/regulations/")
    existing.raise_for_status()
    matched = match_regulation_id(existing.json(), slug)
    if matched:
        return f"skip (already exists: {matched})", matched

    pdf_path = DOCS_DIR / circ["pdf"]
    if not pdf_path.exists():
        return f"ERROR: PDF not found at {pdf_path}", None

    with open(pdf_path, "rb") as f:
        resp = client.post(
            f"{base_url}/regulations/",
            data={"title": circ["title"]},
            files={"file": (pdf_path.name, f, "application/pdf")},
        )

    if resp.status_code == 409:
        # Content hash conflict -- re-fetch and match
        existing2 = client.get(f"{base_url}/regulations/")
        existing2.raise_for_status()
        matched2 = match_regulation_id(existing2.json(), slug)
        if matched2:
            return f"skip (conflict, found existing: {matched2})", matched2
        return "conflict but not found", None

    resp.raise_for_status()
    reg_id = resp.json()["id"]
    return f"uploaded (id={reg_id})", reg_id


def ingest_regulation(client, base_url: str, reg_id: str) -> str:
    resp = client.post(f"{base_url}/regulations/{reg_id}/ingest")
    resp.raise_for_status()
    data = resp.json()
    return f"ingested: {data.get('clause_count', '?')} clauses, class={data.get('document_class', '?')}"


def generate_maps(client, base_url: str, reg_id: str) -> tuple[str, list[dict]]:
    """Returns (message, list_of_maps). Maps are empty on LLM failure."""
    try:
        resp = client.post(f"{base_url}/regulations/{reg_id}/generate")
        if not resp.is_success:
            detail = resp.text[:300]
            return f"generate failed ({resp.status_code}): {detail}", []
        maps = resp.json()
        return f"generated {len(maps)} MAPs", maps
    except Exception as e:
        return f"generate error (LLM may be unavailable): {e}", []


def approve_maps(approver_client, base_url: str, maps: list[dict]) -> str:
    """Approve all DRAFT MAPs using the compliance officer session (maker-checker)."""
    if not maps:
        return "no MAPs to approve"
    approved = 0
    failed = 0
    for m in maps:
        map_id = m.get("id")
        approval_state = (m.get("approval_state") or "").lower()
        if approval_state == "approved":
            approved += 1
            continue
        try:
            resp = approver_client.post(
                f"{base_url}/maps/{map_id}/review",
                json={"action": "approve"},
            )
            if resp.is_success:
                approved += 1
            else:
                failed += 1
        except Exception:
            failed += 1
    suffix = f" ({failed} failed)" if failed else ""
    return f"approved {approved}/{len(maps)} MAPs{suffix}"


def get_approved_maps(client, base_url: str, reg_id: str) -> list[dict]:
    """Fetch all MAPs for regulation, return those with approval_state=Approved."""
    resp = client.get(f"{base_url}/maps/", params={"regulation_id": reg_id})
    if not resp.is_success:
        return []
    all_maps = resp.json()
    return [m for m in all_maps if (m.get("approval_state") or "").lower() == "approved"]


def create_plan_and_snapshot(
    admin_client, approver_client, base_url: str, reg_id: str
) -> tuple[str, str | None]:
    """Create plan candidate from approved MAPs, approve it, create snapshot.

    Returns (message, plan_id_or_None).
    """
    # Check for approved obligations (required by plan candidate endpoint)
    obl_resp = admin_client.get(f"{base_url}/regulations/{reg_id}/obligations")
    obligation_ids = []
    if obl_resp.is_success:
        obligation_ids = [
            str(o["id"])
            for o in obl_resp.json()
            if (o.get("status") or "").upper() == "APPROVED"
        ]

    if not obligation_ids:
        approved_maps = get_approved_maps(admin_client, base_url, reg_id)
        if not approved_maps:
            return "no approved MAPs or obligations -- skipping plan/snapshot", None
        return f"{len(approved_maps)} MAPs approved (no approved ledger obligations for plan candidate) -- skipping plan/snapshot", None

    # Create plan candidate (admin creates)
    try:
        resp = admin_client.post(
            f"{base_url}/regulations/{reg_id}/plans/candidate",
            json={
                "regulation_version_id": reg_id,
                "obligation_ids": obligation_ids,
                "rationale": "Demo plan from approved obligations",
            },
        )
        if not resp.is_success:
            return f"plan candidate failed ({resp.status_code}): {resp.text[:200]}", None
        plan_data = resp.json()
        plan_id = plan_data.get("plan_id") or plan_data.get("id")
    except Exception as e:
        return f"plan candidate error: {e}", None

    # Approve plan (approver -- maker-checker)
    try:
        resp = approver_client.post(
            f"{base_url}/maps/plans/{plan_id}/approve",
            json={"rationale": "Demo plan approval"},
        )
        if not resp.is_success:
            return f"plan approve failed ({resp.status_code}): {resp.text[:200]}", plan_id
    except Exception as e:
        return f"plan approve error: {e}", plan_id

    # Create snapshot (admin)
    try:
        resp = admin_client.post(
            f"{base_url}/reports/snapshots",
            json={
                "regulation_version_id": reg_id,
                "plan_id": plan_id,
                "rationale": "Demo snapshot",
            },
        )
        if not resp.is_success:
            return f"snapshot failed ({resp.status_code}): {resp.text[:200]}", plan_id
        snap_id = resp.json().get("id", "?")
        return f"snapshot created: {snap_id}", plan_id
    except Exception as e:
        return f"snapshot error: {e}", plan_id


def verify_regulation(client, base_url: str, reg_id: str) -> dict:
    checks: dict = {}

    try:
        g = client.get(f"{base_url}/regulations/{reg_id}/graph")
        g.raise_for_status()
        checks["graph_nodes"] = len(g.json().get("nodes", []))
    except Exception as e:
        checks["graph_nodes"] = 0
        checks["graph_error"] = str(e)[:80]

    try:
        s = client.get(f"{base_url}/regulations/{reg_id}/simulate")
        s.raise_for_status()
        sim = s.json()
        checks["median_days"] = sim.get("median_completion_days")
        checks["calibrated"] = sim.get("calibrated", False)
    except Exception as e:
        checks["median_days"] = None
        checks["calibrated"] = False
        checks["simulate_error"] = str(e)[:80]

    try:
        r = client.get(f"{base_url}/reports/{reg_id}/report")
        r.raise_for_status()
        rep = r.json()
        checks["completed"] = rep.get("completed_count", 0)
        checks["total"] = rep.get("total_count", 0)
    except Exception as e:
        checks["completed"] = 0
        checks["total"] = 0
        checks["report_error"] = str(e)[:80]

    return checks


# ---------------------------------------------------------------------------
# Dry-run
# ---------------------------------------------------------------------------

def dry_run():
    print("DRY-RUN: BoM Circulars Demo")
    print(f"Circulars to process: {len(CIRCULARS)}")
    for c in CIRCULARS:
        print(f"  - {c['slug']}: {c['pdf']} -> {c['title']}")
    print()
    print("Flow per circular:")
    print("  Admin:              upload -> ingest -> generate MAPs")
    print("  Compliance officer: approve MAPs  (maker-checker)")
    print("  Admin:              plan candidate -> approve plan -> snapshot -> verify")
    print()
    print("Two sessions used:")
    print(f"  Generator : {ADMIN_EMAIL}")
    print(f"  Approver  : {APPROVER_EMAIL}")
    print()
    print("No API calls made.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run BoM circulars end-to-end demo")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if args.dry_run:
        dry_run()
        return 0

    base_url = args.base_url.rstrip("/")

    try:
        import httpx
    except ImportError:
        print("ERROR: httpx not installed. Run: pip install httpx")
        return 1

    with (
        httpx.Client(follow_redirects=True, timeout=180.0) as admin_client,
        httpx.Client(follow_redirects=True, timeout=180.0) as approver_client,
    ):
        # Login admin
        login = admin_client.post(
            f"{base_url}/auth/login",
            json={"email": ADMIN_EMAIL, "password": DEFAULT_PASSWORD},
        )
        login.raise_for_status()
        print(f"Logged in as {ADMIN_EMAIL} (admin/generator)")

        # Login compliance officer (approver)
        login2 = approver_client.post(
            f"{base_url}/auth/login",
            json={"email": APPROVER_EMAIL, "password": DEFAULT_PASSWORD},
        )
        if not login2.is_success:
            print(
                f"WARNING: Could not log in as {APPROVER_EMAIL} ({login2.status_code})."
                " MAP approval may fail maker-checker."
            )
        else:
            print(f"Logged in as {APPROVER_EMAIL} (compliance officer/approver)")

        results = []
        for circ in CIRCULARS:
            slug = circ["slug"]
            print(f"\n{'='*60}")
            print(f"Processing: {slug}")
            print(f"{'='*60}")

            # 1. Upload
            action, reg_id = upload_regulation(admin_client, base_url, circ)
            print(f"  Upload   : {action}")
            if not reg_id:
                print(f"  ERROR: Could not get regulation ID for {slug}")
                results.append({"slug": slug, "error": "no reg_id"})
                continue

            # 2. Ingest
            try:
                ingest_result = ingest_regulation(admin_client, base_url, reg_id)
                print(f"  Ingest   : {ingest_result}")
            except Exception as e:
                print(f"  Ingest ERROR: {e}")
                results.append({"slug": slug, "error": f"ingest: {e}"})
                continue

            # 3. Generate MAPs (LLM-dependent; fails gracefully)
            gen_msg, maps = generate_maps(admin_client, base_url, reg_id)
            print(f"  Generate : {gen_msg}")

            # 4. Approve MAPs (compliance officer -- maker-checker)
            approve_msg = approve_maps(approver_client, base_url, maps)
            print(f"  Approve  : {approve_msg}")

            # 5. Plan + Snapshot (requires approved MAPs)
            plan_msg, _plan_id = create_plan_and_snapshot(
                admin_client, approver_client, base_url, reg_id
            )
            print(f"  Plan+Snap: {plan_msg}")

            # 6. Verify
            checks = verify_regulation(admin_client, base_url, reg_id)
            print(
                f"  Verify   : graph_nodes={checks['graph_nodes']}, "
                f"median_days={checks.get('median_days')}, "
                f"calibrated={checks.get('calibrated')}, "
                f"completed={checks.get('completed', 0)}/{checks.get('total', 0)}"
            )
            for err_key in ("graph_error", "simulate_error", "report_error"):
                if checks.get(err_key):
                    print(f"             {err_key}: {checks[err_key]}")

            results.append({"slug": slug, "reg_id": reg_id, "maps": len(maps), **checks})

        # Summary table
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print(f"{'Regulation':<30} {'MAPs':>5} {'Nodes':>6} {'Median':>7} {'Done/Total':>11}")
        print("-" * 65)
        for r in results:
            if "error" in r:
                print(f"{r['slug']:<30} ERROR: {r['error']}")
            else:
                med = str(r.get("median_days") or "-")
                done = f"{r.get('completed', 0)}/{r.get('total', 0)}"
                print(
                    f"{r['slug']:<30} {r.get('maps', 0):>5} "
                    f"{r.get('graph_nodes', 0):>6} {med:>7} {done:>11}"
                )

    print("\nDemo complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
