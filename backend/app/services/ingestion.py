import re
from io import BytesIO
from typing import Literal, Optional, cast

from pypdf import PdfReader

from app.schemas.document import Clause, DocumentStructure, Entity, TableInfo


EntityType = Literal[
    "department", "date", "deadline", "role", "system", "threshold", "regulation_ref", "term"
]

# Curated entity lists; expand as needed.
ROLES = [
    "Chief Information Security Officer",
    "Chief Risk Officer",
    "Board of Directors",
    "Risk Management Committee",
    "Compliance Department",
    "Operations function",
]

SYSTEMS = [
    "critical systems",
    "audit logs",
    "multi-factor authentication",
    "internet-facing systems",
    "privileged accounts",
    "remote administrative access",
    "sensitive customer information",
]


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
        # Look for explicit "Title:" field in the header; stop at the next header field.
        m = re.search(
            r"Title:\s*(.*?)(?=\s+(?:Reference number|Date:|$))",
            text,
            re.DOTALL | re.IGNORECASE,
        )
        if m:
            title = m.group(1)
            title = title.replace("-\n", "")
            title = title.replace("\n", " ")
            title = re.sub(r"\s+", " ", title).strip()
            return title
        # Fallback to the first non-empty line that is not a page number or short junk.
        lines = [
            line.strip()
            for line in text.split("\n")
            if line.strip() and not line.strip().isdigit() and len(line.strip()) >= 5
        ]
        return lines[0] if lines else None

    def _is_section_heading(self, line: str) -> bool:
        # Section headings are short top-level numbered noun phrases without verb markers.
        m = re.match(r"^(\d+)\.\s+(.*)$", line)
        if not m:
            return False
        body = m.group(2).strip()
        words = body.split()
        if len(words) > 8:
            return False
        verb_markers = {"shall", "must", "will", "means"}
        if any(word.lower() in verb_markers for word in words):
            return False
        return True

    def _extract_sections(self, text: str) -> list[str]:
        return [
            line.strip()
            for line in text.split("\n")
            if self._is_section_heading(line.strip())
        ]

    def _segment_clauses(self, text: str) -> list[Clause]:
        lines = text.split("\n")
        clauses: list[Clause] = []
        current_id: Optional[str] = None
        current_lines: list[str] = []

        def flush() -> None:
            nonlocal current_id, current_lines
            if current_id is not None:
                clauses.append(self._make_clause(current_id, current_lines))
                current_id = None
                current_lines = []

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            if self._is_section_heading(line):
                flush()
                continue

            # Clause IDs use decimal numbering (e.g. 1.1, 2.2.1) to avoid matching
            # standalone numbers like "90 days." that wrap from the previous line.
            m = re.match(r"^(\d+\.\d+(?:\.\d+)*\.?)\s+(.*)$", line)
            if m:
                flush()
                current_id = m.group(1).rstrip(".")
                current_lines = [m.group(2)]
            elif current_id is not None:
                current_lines.append(line)

        flush()

        if not clauses:
            # Fallback: treat the whole text as a single clause.
            clauses.append(Clause(id="1", text=text[:2000], section=None))
        return clauses

    def _make_clause(self, clause_id: str, lines: list[str]) -> Clause:
        text = "\n".join(lines)
        # Keep the hyphen when rejoining broken compound words (e.g. internet-facing).
        text = text.replace("-\n", "-")
        text = text.replace("\n", " ")
        text = re.sub(r"\s+", " ", text).strip()
        return Clause(id=clause_id, text=text, section=self._parent_section(clause_id))

    def _parent_section(self, clause_id: str) -> Optional[str]:
        parts = clause_id.rstrip(".").split(".")
        return ".".join(parts[:-1]) if len(parts) > 1 else None

    def _extract_tables(self, reader: PdfReader) -> list[TableInfo]:
        # TODO: table extraction - pypdf does not extract table structure natively;
        # placeholder for future OCR/table parser.
        return []

    def _extract_entities(self, text: str) -> list[Entity]:
        seen: set[tuple[str, str]] = set()
        entities: list[Entity] = []

        def add(name: str, entity_type: EntityType) -> None:
            key = (name.lower(), entity_type)
            if key not in seen:
                seen.add(key)
                entities.append(Entity(name=name, type=entity_type))

        # Deadlines
        deadline_patterns = [
            r"(?:within|by)\s+(\d+)\s+(days|months|hours|weeks|years)",
            r"for\s+a\s+minimum\s+period\s+of\s+(\d+)\s+(days|months|hours|weeks|years)",
            r"for\s+at\s+least\s+(\d+)\s+(days|months|hours|weeks|years)",
        ]
        for pattern in deadline_patterns:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                add(f"{m.group(1)} {m.group(2)}", cast(EntityType, "deadline"))

        # Roles and systems are matched against whitespace-normalized text so that
        # line-wrapped terms (e.g. "Chief Information\nSecurity Officer") are found.
        normalized_text = re.sub(r"\s+", " ", text)

        # Roles
        for role in ROLES:
            if re.search(r"\b" + re.escape(role) + r"\b", normalized_text, re.IGNORECASE):
                add(role, cast(EntityType, "role"))

        # Systems / concepts
        for system in SYSTEMS:
            if re.search(r"\b" + re.escape(system) + r"\b", normalized_text, re.IGNORECASE):
                add(system, cast(EntityType, "system"))

        return entities
