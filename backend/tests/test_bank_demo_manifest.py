"""Task 1: validate bank-demo seed manifest links.

Run: cd backend && uv run pytest tests/test_bank_demo_manifest.py -v
"""

import json
import pathlib

BASE = pathlib.Path(__file__).resolve().parent.parent / "seed" / "bank-demo"


def _load_manifest():
    return json.loads((BASE / "bank-demo.json").read_text())


def test_manifest_links_valid():
    manifest = _load_manifest()
    assert "bank" in manifest and "policies" in manifest
    assert "regulations" in manifest
    for p in manifest["policies"]:
        assert "linked_regulation" in p and "owner_dept" in p


def test_manifest_referenced_files_exist():
    manifest = _load_manifest()
    # bank file referenced by manifest must exist on disk
    assert (BASE / manifest["bank"]).is_file()
    # every policy entry must declare a file link under policies/
    # and the referenced markdown file must exist on disk
    assert len(manifest["policies"]) == 3
    for p in manifest["policies"]:
        assert "file" in p and p["file"].startswith("policies/")
        assert (BASE / p["file"]).is_file(), f"missing policy file: {p['file']}"
    # every regulation slug must be a non-empty string
    for r in manifest["regulations"]:
        assert isinstance(r, str) and len(r) > 0
