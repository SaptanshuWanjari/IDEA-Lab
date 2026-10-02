"""Task 7: citation validation against the canonical document.

A candidate is accepted only when:
- its exact quote appears verbatim (whitespace-normalized,
  hyphenation-tolerant) in the canonical text, and
- its page/clause reference exists in the canonical document.
"""

import re
from dataclasses import dataclass, field
from typing import Dict, Optional

from app.schemas.obligation import ObligationCandidate, ValidationResult


@dataclass
class CanonicalClause:
    id: str
    text: str
    page: Optional[int] = None


@dataclass
class CanonicalDocument:
    """Source-versioned canonical text with page/clause/span structure.

    `pages` maps page number -> full page text. `clauses` maps clause id ->
    {"text": ..., "page": ...}. `extraction_quality` carries flags such as
    hyphenation/scan-quality/table presence per page or clause.
    """

    source_version_id: str
    pages: Dict[int, str] = field(default_factory=dict)
    clauses: Dict[str, dict] = field(default_factory=dict)
    extraction_quality: Dict[str, str] = field(default_factory=dict)


def normalize(text: str) -> str:
    """Normalize whitespace and rejoin hyphenated line breaks for matching."""
    t = text.replace("-\n", "-").replace("\n", " ")
    # Tolerance: "internet-facing" and "internet- facing"/"internetfacing"
    # variants caused by line-wrap repair should still match.
    t = re.sub(r"\s+", " ", t).strip().lower()
    return t


def _tolerant_variants(quote: str) -> list:
    base = normalize(quote)
    variants = {base}
    variants.add(base.replace("- ", "").replace("-", ""))
    variants.add(base.replace("-", " "))
    variants.add(base.replace("-", "-"))
    return list(variants)


def validate_candidate(
    candidate: ObligationCandidate, document: CanonicalDocument
) -> ValidationResult:
    reasons: list = []

    # Clause must exist.
    clause = (document.clauses or {}).get(candidate.clause_id)
    if clause is None:
        return ValidationResult(
            accepted=False,
            reasons=[f"clause {candidate.clause_id!r} not found in canonical document"],
        )
    clause_text = clause.get("text", "") if isinstance(clause, dict) else getattr(clause, "text", "")
    clause_page = clause.get("page") if isinstance(clause, dict) else getattr(clause, "page", None)

    # Page must exist when supplied.
    if candidate.page is not None and candidate.page not in (document.pages or {}):
        # Allow page declared on the clause itself even if page map is sparse.
        if candidate.page != clause_page:
            return ValidationResult(
                accepted=False,
                reasons=[f"page {candidate.page} not found in canonical document"],
            )

    # Clause/page cross-check: candidate page must match the clause page.
    if candidate.page is not None and clause_page is not None and candidate.page != clause_page:
        return ValidationResult(
            accepted=False,
            reasons=[
                f"page {candidate.page} does not match clause "
                f"{candidate.clause_id!r} page {clause_page}"
            ],
        )

    # Quote must appear verbatim (normalized, hyphenation-tolerant).
    corpus = " ".join(
        [normalize(str(t)) for t in (document.pages or {}).values()]
        + [normalize(str(clause_text))]
    )
    if not candidate.quote or not candidate.quote.strip():
        return ValidationResult(accepted=False, reasons=["empty quote carries no citation"])
    matched = any(v and v in corpus for v in _tolerant_variants(candidate.quote))
    if not matched:
        return ValidationResult(
            accepted=False,
            reasons=["quote does not appear verbatim in canonical text"],
        )

    reasons.append("quote verified against canonical text")
    return ValidationResult(accepted=True, reasons=reasons)
