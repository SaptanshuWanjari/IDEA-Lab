#!/usr/bin/env python3
"""E2E test for RAG pipeline optimization."""
import httpx
import json
import time

BASE_URL = "http://localhost:8000"
PDF_PATHS = [
    "docs/Circular.pdf",
    "docs/circular2.pdf",
    "docs/circular3.pdf",
]


def main():
    client = httpx.Client(follow_redirects=True, timeout=60.0)

    # 1. Register/login
    resp = client.post(f"{BASE_URL}/auth/register", json={
        "email": "test@pravah.in", "password": "test123", "role": "compliance_officer"
    })
    if resp.status_code == 400:
        resp = client.post(f"{BASE_URL}/auth/login", json={
            "email": "test@pravah.in", "password": "test123"
        })
    resp.raise_for_status()
    cookies = client.cookies

    # 2. Upload each PDF and generate
    for pdf_path in PDF_PATHS:
        print(f"\n=== Processing {pdf_path} ===")
        with open(pdf_path, "rb") as f:
            resp = client.post(f"{BASE_URL}/regulations/",
                data={"title": pdf_path}, files={"file": (pdf_path, f, "application/pdf")},
                cookies=cookies)
        resp.raise_for_status()
        reg = resp.json()
        reg_id = reg["id"]
        print(f"Created regulation: {reg_id}")

        # 3. Check ingestion quality
        resp = client.get(f"{BASE_URL}/regulations/{reg_id}", cookies=cookies)
        resp.raise_for_status()
        print(f"Document class: {resp.json().get('document_class')}")

        # 4. Trigger generation
        resp = client.post(f"{BASE_URL}/regulations/{reg_id}/generate", cookies=cookies)
        resp.raise_for_status()
        print("Generation triggered")

        # 5. Poll for completion (simplified)
        for _ in range(30):
            time.sleep(2)
            resp = client.get(f"{BASE_URL}/regulations/{reg_id}/obligations", cookies=cookies)
            if resp.status_code == 200 and resp.json():
                break

        # 6. Check obligations
        resp = client.get(f"{BASE_URL}/regulations/{reg_id}/obligations", cookies=cookies)
        obligations = resp.json()
        print(f"Obligations extracted: {len(obligations)}")

        # 7. Check MAPs
        resp = client.get(f"{BASE_URL}/regulations/{reg_id}/maps", cookies=cookies)
        maps = resp.json()
        print(f"MAPs generated: {len(maps)}")

        # 8. Verify deadlines present
        deadline_count = sum(1 for m in maps if m.get("deadline_days"))
        print(f"MAPs with deadlines: {deadline_count}/{len(maps)}")

        # 9. Check confidence spread
        confidences = [m.get("confidence", 0) for m in maps]
        if confidences:
            print(f"Confidence range: {min(confidences):.2f} - {max(confidences):.2f}")

        # 10. Check graph
        resp = client.get(f"{BASE_URL}/regulations/{reg_id}/graph", cookies=cookies)
        graph = resp.json()
        print(f"Graph nodes: {len(graph.get('nodes', []))}, edges: {len(graph.get('edges', []))}")

    print("\n=== E2E TEST COMPLETE ===")


if __name__ == "__main__":
    main()