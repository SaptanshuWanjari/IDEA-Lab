import os
import re
from io import BytesIO
from typing import Literal, Optional, cast

import pdfplumber

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
    def extract(self, pdf_bytes: bytes, source_version_id: str | None = None) -> DocumentStructure:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            page_texts = [page.extract_text() or "" for page in pdf.pages]
            text = "\n".join(page_texts)
            # Extract tables using pdfplumber
            tables = []
            for i, page in enumerate(pdf.pages):
                page_tables = page.extract_tables()
                if page_tables:
                    for table_data in page_tables:
                        tables.append(TableInfo(
                            page=i + 1,
                            rows=table_data,
                        ))

        # Optional OCR fallback for scanned/image-based pages
        enable_ocr = os.getenv("ENABLE_OCR", "false").lower() == "true"
        if enable_ocr:
            try:
                import pytesseract
                from pdf2image import convert_from_bytes
                # For pages flagged as low-yield, run OCR
                scan_pages = [i for i, t in enumerate(page_texts) if len(t.strip()) < 50]
                if scan_pages:
                    images = convert_from_bytes(pdf_bytes)
                    for page_idx in scan_pages:
                        if page_idx < len(images):
                            ocr_text = pytesseract.image_to_string(images[page_idx])
                            if ocr_text.strip():
                                page_texts[page_idx] = ocr_text
                    # Rebuild combined text after OCR
                    text = "\n".join(page_texts)
            except ImportError:
                import logging
                logging.warning("OCR requested but pytesseract/pdf2image not installed")

        sections = self._extract_sections(text)
        clauses = self._segment_clauses(text, page_texts=page_texts)
        entities = self._extract_entities(text)
        quality = self._assess_quality(page_texts, tables)
        return DocumentStructure(
            title=self._extract_title(text),
            sections=sections,
            clauses=clauses,
            tables=tables,
            entities=entities,
            metadata={"source": "pdfplumber", "page_count": len(page_texts)},
            raw_markdown=text,
            source_version_id=source_version_id,
            pages={i + 1: t for i, t in enumerate(page_texts)},
            extraction_quality=quality,
        )

    def to_canonical_document(self, doc: DocumentStructure):
        """Build the source-versioned canonical document for citation validation."""
        from app.services.citation_validator import CanonicalDocument

        return CanonicalDocument(
            source_version_id=doc.source_version_id or "unknown",
            pages=dict(doc.pages or {}),
            clauses={
                c.id: {"text": c.text, "page": c.page} for c in doc.clauses
            },
            extraction_quality=dict(doc.extraction_quality or {}),
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

    def _segment_clauses(self, text: str, page_texts: list[str] | None = None) -> list[Clause]:
        # Map line index -> page number when per-page texts are available.
        line_pages: list[int] = []
        if page_texts is not None:
            for i, pt in enumerate(page_texts):
                line_pages.extend([i + 1] * max(len(pt.split("\n")), 1))
        lines = text.split("\n")
        clauses: list[Clause] = []
        current_id: Optional[str] = None
        current_lines: list[str] = []
        current_page: Optional[int] = None
        current_start: Optional[int] = None
        offset = 0  # char offset of the current line in the combined text

        def flush() -> None:
            nonlocal current_id, current_lines, current_page, current_start
            if current_id is not None:
                clauses.append(
                    self._make_clause(
                        current_id, current_lines,
                        page=current_page, char_start=current_start,
                    )
                )
                current_id = None
                current_lines = []
                current_page = None
                current_start = None

        for line_idx, raw_line in enumerate(lines):
            line = raw_line.strip()
            offset += len(raw_line) + 1
            if not line:
                continue

            if self._is_section_heading(line):
                flush()
                continue

            # ENHANCED: Multiple clause patterns for RBI circulars
            clause_patterns = [
                # Standard: 1.1, 2.2.1, etc.
                r"^(\d+\.\d+(?:\.\d+)*\.?)\s+(.*)$",
                # Annex: Annex A, Annex-1, Annexure I
                r"^(Annex[-\s]?[A-Z0-9IVX]+)\s+(.*)$",
                # Sub-clauses: (a), (i), (1)
                r"^\(([a-z]|[ivx]+|\d+)\)\s+(.*)$",
            ]

            matched = False
            for pattern in clause_patterns:
                m = re.match(pattern, line, re.IGNORECASE)
                if m:
                    flush()
                    current_id = m.group(1).rstrip(".").replace(" ", "-")
                    current_lines = [m.group(2)]
                    current_page = line_pages[line_idx] if line_idx < len(line_pages) else None
                    current_start = offset
                    matched = True
                    break

            if not matched and current_id is not None:
                # Continuation of current clause (wrapped line)
                current_lines.append(line)

        flush()

        if not clauses:
            # Fallback: treat the whole text as a single clause.
            clauses.append(Clause(id="1", text=text[:2000], section=None))
        return clauses

    def _make_clause(
        self,
        clause_id: str,
        lines: list[str],
        page: Optional[int] = None,
        char_start: Optional[int] = None,
    ) -> Clause:
        raw = "\n".join(lines)
        hyphenated = bool(re.search(r"\w-\n", raw))
        text = raw
        # Keep the hyphen when rejoining broken compound words (e.g. internet-facing).
        text = text.replace("-\n", "-")
        text = text.replace("\n", " ")
        text = re.sub(r"\s+", " ", text).strip()
        quality: dict = {}
        if hyphenated:
            quality["hyphenation"] = "repaired"
        char_end = char_start + len(raw) if char_start is not None else None
        return Clause(
            id=clause_id, text=text, section=self._parent_section(clause_id),
            page=page, char_start=char_start, char_end=char_end,
            extraction_quality=quality,
        )

    def _parent_section(self, clause_id: str) -> Optional[str]:
        parts = clause_id.rstrip(".").split(".")
        return ".".join(parts[:-1]) if len(parts) > 1 else None

    def _assess_quality(self, page_texts: list[str], tables: list) -> dict:
        """Flag extraction-quality concerns per document: hyphenation repairs,
        low-yield (scanned) pages, and table presence."""
        flags: dict = {}
        hyphen_pages = [i + 1 for i, t in enumerate(page_texts) if re.search(r"\w-\n", t)]
        if hyphen_pages:
            flags["hyphenation"] = f"repaired on pages {hyphen_pages}"
        scan_pages = [i + 1 for i, t in enumerate(page_texts) if len(t.strip()) < 50]
        if scan_pages:
            flags["scan_quality"] = f"low text yield on pages {scan_pages}; may need OCR"
        if tables:
            flags["table"] = f"{len(tables)} table(s) extracted"
        else:
            flags["table"] = "no table structure extracted"
        return flags

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

        # Regulation references
        reg_ref_pattern = r"(Master Direction|Circular|Framework|Guideline).*?RBI/\w+/\d{4}-\d{2}/\d+"
        for m in re.finditer(reg_ref_pattern, text, re.IGNORECASE):
            add(m.group(0), cast(EntityType, "regulation_ref"))

        # Dates
        date_pattern = r"\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b"
        for m in re.finditer(date_pattern, text, re.IGNORECASE):
            add(m.group(0), cast(EntityType, "date"))

        # Thresholds
        threshold_pattern = r"\b\d+(?:\.\d+)?\s*(?:crore|lakh|million|billion|%|percent|basis points?)\b"
        for m in re.finditer(threshold_pattern, text, re.IGNORECASE):
            add(m.group(0), cast(EntityType, "threshold"))

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

        # Departments
        dept_patterns = [
            r"Department of\s+\w+(?:\s+\w+)*",
            r"\w+\s+Department",
        ]
        for pattern in dept_patterns:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                add(m.group(0), cast(EntityType, "department"))

        return entities
