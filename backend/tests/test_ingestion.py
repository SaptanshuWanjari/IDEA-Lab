from app.schemas.document import Clause, DocumentStructure
from app.services.document_classifier import classify_document
from app.services.ingestion import IngestionService


def test_segment_clauses():
    service = IngestionService()
    text = "1. All banks shall implement MFA.\n2. Banks must report fraud within 7 days.\n"
    clauses = service._segment_clauses(text)
    assert len(clauses) == 2
    assert clauses[0].id == "1"
    assert "MFA" in clauses[0].text


def test_extract_entities():
    service = IngestionService()
    text = "Banks must report fraud within 7 days and complete remediation by 30 days."
    entities = service._extract_entities(text)
    assert len(entities) == 2
    assert all(e.type == "date" for e in entities)


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
