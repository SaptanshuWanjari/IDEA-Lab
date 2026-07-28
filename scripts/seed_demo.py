import argparse
import sys

import httpx

BASE_URL = "http://localhost:8000"


def create_demo_user(client: httpx.Client):
    resp = client.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "demo@pravah.local",
            "password": "demo123",
            "role": "compliance_officer",
        },
    )
    if resp.status_code == 400 and "already registered" in resp.text:
        resp = client.post(
            f"{BASE_URL}/auth/login",
            json={"email": "demo@pravah.local", "password": "demo123"},
        )
    resp.raise_for_status()
    return resp.json()


def seed_demo():
    client = httpx.Client(follow_redirects=True)
    user = create_demo_user(client)
    print(f"Demo user: {user['email']}")

    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", help="Path to a demo PDF")
    args = parser.parse_args()

    if args.pdf:
        with open(args.pdf, "rb") as f:
            resp = client.post(
                f"{BASE_URL}/regulations/",
                data={"title": "Demo RBI Circular"},
                files={"file": ("demo.pdf", f, "application/pdf")},
            )
            resp.raise_for_status()
            regulation = resp.json()
            print(f"Created regulation: {regulation['id']}")

            client.post(f"{BASE_URL}/regulations/{regulation['id']}/generate")
            print("Generation triggered.")


if __name__ == "__main__":
    seed_demo()
