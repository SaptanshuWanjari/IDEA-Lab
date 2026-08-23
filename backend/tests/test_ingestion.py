from pathlib import Path

from app.schemas.document import Clause, DocumentStructure
from app.services.document_classifier import classify_document
from app.services.ingestion import IngestionService


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_extract_title_from_header():
    service = IngestionService()
    header = (
        "Master Direction / Notification header: Title: Master Direction – Cybersecurity\n"
        "and Digital Banking Controls Reference number and date: RBI/DPSS/2026-27/84, dated Feb 28, 2026\n"
    )
    assert service._extract_title(header) == "Master Direction – Cybersecurity and Digital Banking Controls"


def test_extract_title_fallback():
    service = IngestionService()
    assert service._extract_title("Some title\nSome body") == "Some title"


def test_extract_title_fallback_skips_page_numbers():
    service = IngestionService()
    text = "1\n2\nActual title here\nMore body"
    assert service._extract_title(text) == "Actual title here"


def test_extract_sections_skip_clause_bodies():
    service = IngestionService()
    text = (
        "1. Applicability and Definitions\n"
        "1.1 These directions shall apply to all regulated entities.\n"
        "2. Access Controls\n"
        "2.1 The Chief Information Security Officer shall ensure controls.\n"
    )
    sections = service._extract_sections(text)
    assert sections == ["1. Applicability and Definitions", "2. Access Controls"]


def test_section_headings_not_in_clauses():
    service = IngestionService()
    text = (
        "1. Applicability and Definitions\n"
        "1.1 These directions shall apply to all regulated entities.\n"
        "2. Access Controls\n"
        "2.1 The Chief Information Security Officer shall ensure controls.\n"
    )
    clauses = service._segment_clauses(text)
    assert all("Applicability and Definitions" not in c.text for c in clauses)
    assert all("Access Controls" not in c.text for c in clauses)
    assert {c.id for c in clauses} == {"1.1", "2.1"}


def test_clause_text_merges_hyphenated_line_breaks():
    service = IngestionService()
    text = (
        "2.1 Every regulated entity shall deploy multi-factor authentication for all internet-\n"
        "facing critical systems, privileged accounts and remote administrative access, within 60 days.\n"
    )
    clauses = service._segment_clauses(text)
    assert len(clauses) == 1
    assert clauses[0].text == (
        "Every regulated entity shall deploy multi-factor authentication for all internet-facing "
        "critical systems, privileged accounts and remote administrative access, within 60 days."
    )
    assert "-\n" not in clauses[0].text
    assert "internet-facing" in clauses[0].text


def test_extract_entities_deadlines():
    service = IngestionService()
    text = "Banks must report fraud within 7 days and complete remediation by 30 days."
    entities = service._extract_entities(text)
    assert len(entities) == 2
    assert all(e.type == "deadline" for e in entities)


def test_extract_entities_retention_periods():
    service = IngestionService()
    text = (
        "Regulated entities shall maintain audit logs for a minimum period of 12 months. "
        "Records relating to cyber incidents shall be preserved for at least 8 years."
    )
    entities = service._extract_entities(text)
    deadlines = [e.name for e in entities if e.type == "deadline"]
    assert "12 months" in deadlines
    assert "8 years" in deadlines


def test_extract_entities_includes_roles_and_systems():
    service = IngestionService()
    text = (
        "The Chief Information Security Officer shall ensure audit logs for critical systems. "
        "The Board of Directors and Risk Management Committee shall review."
    )
    entities = service._extract_entities(text)
    types = {e.type for e in entities}
    assert "role" in types
    assert "system" in types


def test_extract_entities_finds_line_wrapped_roles():
    service = IngestionService()
    text = "The Chief Information\nSecurity Officer shall ensure controls."
    entities = service._extract_entities(text)
    roles = [e.name for e in entities if e.type == "role"]
    assert "Chief Information Security Officer" in roles


def test_classify_rbi_circular():
    doc = DocumentStructure(
        title="Reserve Bank of India Circular",
        clauses=[Clause(id="1", text="RBI directs all banks")],
    )
    assert classify_document(doc) == "RBI Circular"


def test_classify_policy():
    doc = DocumentStructure(
        title="Fraud Monitoring Policy",
        clauses=[Clause(id="1", text="This policy defines the framework")],
    )
    assert classify_document(doc) == "Policy"


def test_ingest_sample_pdf():
    service = IngestionService()
    pdf_bytes = (FIXTURES_DIR / "sample.pdf").read_bytes()
    doc = service.extract(pdf_bytes)

    assert doc.title == "Master Direction – Cybersecurity and Digital Banking Controls"

    # Section headings are short noun phrases, not clause bodies.
    assert any("Access Controls and Multi-Factor Authentication" in s for s in doc.sections)
    assert not any("shall" in s for s in doc.sections)

    # Clause text has no hyphenated line breaks and no orphaned headings.
    clause_texts = [c.text for c in doc.clauses]
    assert not any("-\n" in t for t in clause_texts)
    assert not any("internet- facing" in t for t in clause_texts)
    assert any("internet-facing" in t for t in clause_texts)
    assert all("Applicability and Definitions" not in c.text for c in doc.clauses)

    # Entities include roles and deadlines.
    assert any(e.type == "role" for e in doc.entities)
    assert any(e.type == "deadline" for e in doc.entities)
