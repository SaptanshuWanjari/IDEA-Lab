#!/usr/bin/env python3
"""End-to-end demo: 3 BoM circulars → full compliance lifecycle.

Usage:
    python scripts/demo_bom_circulars.py --base-url http://localhost:8000
    python scripts/demo_bom_circulars.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import httpx

DEFAULT_BASE_URL = "http://localhost:8000"
DEFAULT_PASSWORD = "Demobank@123"

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

# Map slug to expected title keywords for matching existing regulations
REGULATION_TITLE_KEYWORDS = {
    "nrd-csr-2026": ["NRD", "CSR", "Non-Resident", "Sankalan"],
    "ferr-2026": ["FERR", "Foreign Exchange Risk", "Risk Reserve"],
    "fx-derivatives-2026": ["FX Derivative", "Inter-Bank", "rebooking", "rollover"],
}


def load_manifest() -> dict:
    return json.loads((SEED_DIR / "bank-demo.json").read_text())


def ensure_user(client: "httpx.Client", base_url: str, email: str, role: str, password: str) -> str:
    resp = client.post(f"{base_url}/auth/register", json={"email": email, "password": password, "role": role})
    if resp.status_code in (200, 201):
        return "created"
    if resp.status_code == 400 and "already registered" in resp.text.lower():
        login = client.post(f"{base_url}/auth/login", json={"email": email, "password": password})
        login.raise_for_status()
        return "exists-login-ok"
    resp.raise_for_status()
    return "created"


def match_regulation_id(regs: list[dict], slug: str) -> str | None:
    needle = slug.lower()
    for r in regs:
        url = (r.get("source_pdf_url") or "").lower()
        if needle and needle in url:
            return r.get("id")
    # Try matching by title keywords (since PDF extraction may give garbled titles)
    keywords = REGULATION_TITLE_KEYWORDS.get(slug, [])
    for r in regs:
        actual = (r.get("title") or "").lower()
        summary = (r.get("summary") or "").lower()
        if any(kw.lower() in actual for kw in keywords) or any(kw.lower() in summary for kw in keywords):
            return r.get("id")
    return None


def upload_regulation(client: "httpx.Client", base_url: str, circ: dict) -> tuple[str, str | None]:
    slug = circ["slug"]
    existing = client.get(f"{base_url}/regulations/")
    existing.raise_for_status()
    matched = match_regulation_id(existing.json(), slug)
    if matched:
        return f"skip (already exists: {matched})", matched

    pdf_path = DOCS_DIR / circ["pdf"]
    with open(pdf_path, "rb") as f:
        resp = client.post(
            f"{base_url}/regulations/",
            data={"title": circ["title"]},
            files={"file": (pdf_path.name, f, "application/pdf")},
        )
    if resp.status_code == 409:
        # Content hash conflict - find the existing regulation by keywords
        existing2 = client.get(f"{base_url}/regulations/")
        existing2.raise_for_status()
        matched2 = match_regulation_id(existing2.json(), slug)
        if matched2:
            return f"skip (conflict, found existing: {matched2})", matched2
        return "conflict but not found", None
    resp.raise_for_status()
    reg_id = resp.json()["id"]
    return f"uploaded (id={reg_id})", reg_id


def ingest_regulation(client: "httpx.Client", base_url: str, reg_id: str) -> str:
    resp = client.post(f"{base_url}/regulations/{reg_id}/ingest")
    resp.raise_for_status()
    data = resp.json()
    return f"ingested: {data.get('clause_count', '?')} clauses, class={data.get('document_class', '?')}"


def generate_maps(client: "httpx.Client", base_url: str, reg_id: str) -> str:
    try:
        resp = client.post(f"{base_url}/regulations/{reg_id}/generate")
        resp.raise_for_status()
        maps = resp.json()
        return f"generated {len(maps)} MAPs"
    except Exception as e:
        return f"generate skipped/failed (LLM may be unavailable): {e}"


def approve_obligations(client: "httpx.Client", base_url: str, reg_id: str) -> str:
    resp = client.get(f"{base_url}/regulations/{reg_id}/obligations")
    resp.raise_for_status()
    obligations = resp.json()
    approved = 0
    for ob in obligations:
        if ob.get("status") != "APPROVED":
            try:
                client.post(
                    f"{base_url}/regulations/{reg_id}/obligations/{ob['id']}/review",
                    json={"decision": "approve", "reviewer_id": "admin", "rationale": "Demo approval"},
                )
                approved += 1
            except Exception:
                pass
    return f"approved {approved}/{len(obligations)} obligations"


def create_plan_and_snapshot(client: "httpx.Client", base_url: str, reg_id: str) -> str:
    # First, get approved obligations
    resp = client.get(f"{base_url}/regulations/{reg_id}/obligations")
    resp.raise_for_status()
    obligations = resp.json()
    approved_ids = [ob["id"] for ob in obligations if ob.get("status") == "APPROVED"]
    
    if not approved_ids:
        return "no approved obligations to create plan"
    
    # Create plan candidate
    try:
        resp = client.post(
            f"{base_url}/regulations/{reg_id}/plans/candidate",
            json={"obligation_ids": approved_ids, "rationale": "Demo plan from approved obligations"},
        )
        resp.raise_for_status()
        plan = resp.json()
        plan_id = plan["plan_id"]
    except Exception as e:
        return f"plan candidate failed: {e}"
    
    # Approve plan
    try:
        resp = client.post(
            f"{base_url}/maps/plans/{plan_id}/approve",
            json={"rationale": "Demo plan approval"},
        )
        resp.raise_for_status()
    except Exception as e:
        return f"plan approve failed: {e}"
    
    # Get regulation version id
    reg_resp = client.get(f"{base_url}/regulations/{reg_id}")
    reg_resp.raise_for_status()
    reg_data = reg_resp.json()
    # Try to get the regulation version id - might need to get from versions endpoint
    reg_version_id = reg_data.get("current_version_id") or reg_id
    
    # Create snapshot
    try:
        resp = client.post(
            f"{base_url}/reports/snapshots",
            json={"regulation_version_id": reg_version_id, "plan_id": plan_id, "rationale": "Demo snapshot"},
        )
        resp.raise_for_status()
        return f"snapshot created: {resp.json().get('id', '?')}"
    except Exception as e:
        return f"snapshot failed: {e}"


def verify_regulation(client: "httpx.Client", base_url: str, reg_id: str, slug: str) -> dict:
    checks = {}
    # Graph - may fail if no MAPs generated (LLM unavailable)
    try:
        g = client.get(f"{base_url}/regulations/{reg_id}/graph")
        g.raise_for_status()
        checks["graph_nodes"] = len(g.json().get("nodes", []))
    except Exception as e:
        checks["graph_nodes"] = 0
        checks["graph_error"] = str(e)
    # Simulate - may fail if no MAPs
    try:
        s = client.get(f"{base_url}/regulations/{reg_id}/simulate")
        s.raise_for_status()
        sim = s.json()
        checks["median_days"] = sim.get("median_completion_days")
        checks["calibrated"] = sim.get("calibrated", False)
    except Exception as e:
        checks["median_days"] = None
        checks["calibrated"] = False
        checks["simulate_error"] = str(e)
    # Report
    try:
        r = client.get(f"{base_url}/reports/{reg_id}/report")
        r.raise_for_status()
        rep = r.json()
        checks["completed"] = rep.get("completed_count", 0)
        checks["total"] = rep.get("total_count", 0)
    except Exception as e:
        checks["completed"] = 0
        checks["total"] = 0
        checks["report_error"] = str(e)
    return checks


def dry_run():
    print("DRY-RUN: BoM Circulars Demo")
    print(f"Circulars to process: {len(CIRCULARS)}")
    for c in CIRCULARS:
        print(f"  - {c['slug']}: {c['pdf']} → {c['title']}")
    print("Flow per circular: upload → ingest → generate → approve → snapshot → verify")
    print("No API calls made.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run BoM circulars end-to-end demo")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if args.dry_run:
        dry_run()
        return 0

    base_url = args.base_url.rstrip("/")
    import httpx

    with httpx.Client(base_url=base_url, follow_redirects=True, timeout=120.0) as client:
        # Login as admin
        login = client.post(f"{base_url}/auth/login", json={"email": "admin@demobank.in", "password": DEFAULT_PASSWORD})
        login.raise_for_status()
        print("Logged in as admin@demobank.in")

        results = []
        for circ in CIRCULARS:
            slug = circ["slug"]
            print(f"\n{'='*60}")
            print(f"Processing: {slug}")
            print(f"{'='*60}")

            # Upload
            action, reg_id = upload_regulation(client, base_url, circ)
            print(f"  Upload: {action}")
            if not reg_id:
                print(f"  ERROR: Could not get regulation ID for {slug}")
                results.append({"slug": slug, "error": "no reg_id"})
                continue

            # Ingest
            try:
                ingest_result = ingest_regulation(client, base_url, reg_id)
                print(f"  Ingest: {ingest_result}")
            except Exception as e:
                print(f"  Ingest ERROR: {e}")
                results.append({"slug": slug, "error": f"ingest: {e}"})
                continue

            # Generate MAPs
            gen_result = generate_maps(client, base_url, reg_id)
            print(f"  Generate: {gen_result}")

            # Approve obligations
            approve_result = approve_obligations(client, base_url, reg_id)
            print(f"  Approve: {approve_result}")

            # Create plan and snapshot
            snap_result = create_plan_and_snapshot(client, base_url, reg_id)
            print(f"  Plan+Snapshot: {snap_result}")

            # Verify
            try:
                checks = verify_regulation(client, base_url, reg_id, slug)
                print(f"  Verify: graph_nodes={checks['graph_nodes']}, median_days={checks['median_days']}, "
                      f"calibrated={checks['calibrated']}, completed={checks['completed']}/{checks['total']}")
                results.append({"slug": slug, "reg_id": reg_id, **checks})
            except Exception as e:
                print(f"  Verify ERROR: {e}")
                results.append({"slug": slug, "error": f"verify: {e}"})

        # Summary
        print(f"\n{'='*60}")
        print("SUMMARY")
        print(f"{'='*60}")
        print(f"{'Regulation':<30} {'Nodes':>5} {'Median':>7} {'Cal':>4} {'Done/Total':>10}")
        print("-" * 60)
        for r in results:
            if "error" in r:
                print(f"{r['slug']:<30} ERROR: {r['error']}")
            else:
                print(f"{r['slug']:<30} {r['graph_nodes']:>5} {str(r['median_days']):>7} "
                      f"{str(r['calibrated']):>4} {r['completed']}/{r['total']:>5}")

    print("\nDemo complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())