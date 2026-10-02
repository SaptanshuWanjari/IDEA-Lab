from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import Evidence
from app.models.map import MAP


class ValidationService:
    def __init__(self, session: AsyncSession, llm_client=None):
        self.session = session
        self.llm = llm_client

    async def check_completeness(self, map_id: str, evidence_filename: str) -> dict:
        """Advisory filename-overlap signal (kept for compatibility).

        .. deprecated::
            A filename alone can never satisfy an evidence requirement.
            MAP completion requires an APPROVED content-level
            ``EvidenceAssessment`` from a different approver. Prefer
            :meth:`content_based_check`.
        """
        m = await self.session.get(MAP, map_id)
        if not m or not m.evidence_required:
            return {
                "complete": True,
                "note": "No evidence requirement specified",
                "advisory": True,
            }

        req_keywords = set(m.evidence_required.lower().split())
        file_keywords = set(
            evidence_filename.lower().replace(".pdf", "").replace(".", " ").replace("_", " ").split()
        )
        overlap = req_keywords & file_keywords

        advisory_note = (
            "filename-only signal; advisory — completion requires an "
            "APPROVED content-level evidence assessment"
        )
        if overlap:
            return {
                "complete": True,
                "overlap_keywords": list(overlap),
                "needs_manual_review": False,
                "method": "keyword",
                "advisory": True,
                "note": advisory_note,
            }

        if self.llm:
            prompt = f"""A MAP requires this evidence: "{m.evidence_required}"
The uploaded file is named: "{evidence_filename}"
Does the filename strongly suggest this requirement is satisfied? Answer only YES or NO."""
            try:
                answer = self.llm.chat(
                    [{"role": "user", "content": prompt}], temperature=0.0, max_tokens=5
                )
                complete = "YES" in answer.upper()
                return {
                    "complete": complete,
                    "needs_manual_review": not complete,
                    "method": "llm",
                    "llm_response": answer.strip(),
                    "advisory": True,
                    "note": advisory_note,
                }
            except Exception:
                return {
                    "complete": False,
                    "needs_manual_review": True,
                    "method": "llm_failed",
                    "advisory": True,
                    "note": advisory_note,
                }

        return {
            "complete": False,
            "overlap_keywords": [],
            "needs_manual_review": True,
            "method": "keyword",
            "advisory": True,
            "note": advisory_note,
        }

    async def content_based_check(self, map_id: str, content_text: str | None, checklist=None) -> dict:
        """Compare verified evidence content against the MAP requirement.

        Unlike :meth:`check_completeness`, this never marks evidence
        complete from a filename. With a checklist, every required item
        must be supported by the content; without one, requirement
        keywords must appear in the content itself.
        """
        from app.services.evidence_assessment import evaluate_checklist

        m = await self.session.get(MAP, map_id)
        requirement = (getattr(m, "evidence_required", None) or "") if m else ""
        if not content_text or not content_text.strip():
            return {
                "complete": False,
                "needs_manual_review": True,
                "method": "content",
                "advisory": True,
                "note": "no verified content available; filename alone is never sufficient",
            }
        if checklist is not None:
            from app.schemas.evidence import EvidenceChecklist as _Checklist

            items = _Checklist(**checklist) if isinstance(checklist, dict) else checklist
            results = evaluate_checklist(content_text, items)
            missing = [k for k, r in results.items() if r.required and not r.passed]
            return {
                "complete": not missing,
                "needs_manual_review": bool(missing),
                "method": "content",
                "advisory": True,
                "missing_elements": missing,
                "checklist_results": {
                    k: {"passed": r.passed, "support": r.support, "missing_terms": r.missing_terms}
                    for k, r in results.items()
                },
                "note": "advisory content match; completion requires an APPROVED assessment",
            }
        req_keywords = {w for w in requirement.lower().split() if len(w) > 2}
        content_words = set(content_text.lower().split())
        overlap = req_keywords & content_words
        return {
            "complete": bool(req_keywords) and req_keywords <= content_words,
            "needs_manual_review": not (req_keywords and req_keywords <= content_words),
            "method": "content",
            "advisory": True,
            "overlap_keywords": sorted(overlap),
            "note": "advisory content match; completion requires an APPROVED assessment",
        }

    async def functional_coverage(self, regulation_id: str) -> dict:
        """Check that every clause with an obligation has a completed MAP."""
        result = await self.session.execute(select(MAP).where(MAP.regulation_id == regulation_id))
        maps = result.scalars().all()
        covered_clauses = set()
        all_clauses = set()
        for m in maps:
            if m.source_clauses:
                all_clauses.update(m.source_clauses)
                if m.status == "Completed":
                    covered_clauses.update(m.source_clauses)
        uncovered = all_clauses - covered_clauses
        return {
            "total_clauses": len(all_clauses),
            "covered_clauses": len(covered_clauses),
            "uncovered_clauses": list(uncovered),
            "coverage_pct": (len(covered_clauses) / len(all_clauses) * 100) if all_clauses else 100,
        }

    async def integrity_check(self, regulation_id: str) -> list[str]:
        """Run basic integrity checks for the regulation."""
        issues = []
        result = await self.session.execute(select(MAP).where(MAP.regulation_id == regulation_id))
        maps = result.scalars().all()
        map_ids = {m.id for m in maps}
        ev_result = await self.session.execute(select(Evidence).where(Evidence.map_id.in_(map_ids)))
        evidence = ev_result.scalars().all()
        evidence_by_map: dict = {}
        for ev in evidence:
            evidence_by_map.setdefault(ev.map_id, []).append(ev)
        for m in maps:
            if m.status == "Completed" and not evidence_by_map.get(m.id):
                issues.append(f"MAP {m.id} is Completed but has no evidence")
        return issues
