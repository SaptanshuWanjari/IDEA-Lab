import re
from io import BytesIO
from typing import Optional

from pypdf import PdfReader

from app.schemas.document import Clause, DocumentStructure, Entity, TableInfo


class IngestionService:
    def extract(self, pdf_bytes: bytes) -> DocumentStructure:
        reader = PdfReader(BytesIO(pdf_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        sections = self._extract_sections(text)
        clauses = self._segment_clauses(text)
        tables = self._extract_tables(reader)
        entities = self._extract_entities(text)
        return DocumentStructure(
            title=self._extract_title(text),
            sections=sections,
            clauses=clauses,
            tables=tables,
            entities=entities,
            metadata={"source": "pypdf", "page_count": len(reader.pages)},
            raw_markdown=text,
        )

    def _extract_title(self, text: str) -> Optional[str]:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return lines[0] if lines else None

    def _extract_sections(self, text: str) -> list[str]:
        # Look for numbered section headings like "4. Compliance Requirements"
        return re.findall(r"^\d+(?:\.\d+)*\s+[A-Z][A-Za-z\s]+$", text, re.MULTILINE)

    def _segment_clauses(self, text: str) -> list[Clause]:
        pattern = re.compile(r"^(\d+(?:\.\d+)*\.?)\s+(.*)$", re.MULTILINE)
        clauses = []
        for m in pattern.finditer(text):
            clause_id = m.group(1).rstrip(".")
            clauses.append(
                Clause(
                    id=clause_id,
                    text=m.group(2).strip(),
                    section=self._parent_section(clause_id),
                )
            )
        if not clauses:
            # Fallback: treat the whole text as a single clause
            clauses.append(Clause(id="1", text=text[:2000], section="1"))
        return clauses

    def _parent_section(self, clause_id: str) -> Optional[str]:
        parts = clause_id.rstrip(".").split(".")
        return ".".join(parts[:-1]) if len(parts) > 1 else None

    def _extract_tables(self, reader: PdfReader) -> list[TableInfo]:
        # pypdf does not extract table structure natively; placeholder for future OCR/table parser
        return []

    def _extract_entities(self, text: str) -> list[Entity]:
        entities = []
        for m in re.finditer(r"(within|by)\s+(\d+)\s+(days|months)", text, re.IGNORECASE):
            entities.append(Entity(name=f"{m.group(2)} {m.group(3)}", type="date"))
        return entities
