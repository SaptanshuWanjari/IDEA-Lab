from app.schemas.document import DocumentStructure


def classify_document(doc: DocumentStructure) -> str:
    text = (doc.title or "") + " " + " ".join(c.text for c in doc.clauses[:20])
    lower = text.lower()
    if "reserve bank of india" in lower or "rbi" in lower or "circular" in lower:
        return "RBI Circular"
    if "policy" in lower or "framework" in lower:
        return "Policy"
    if "standard operating procedure" in lower or "procedure" in lower:
        return "SOP"
    return "Evidence"
