UNDERSTANDING_PROMPT = """You are a senior banking compliance analyst. Read the following regulation text and produce:
1. A plain-language summary in 2-3 paragraphs understandable by any bank employee.
2. A list of affected domains (IT, Risk, Compliance, Operations, Audit).

Text:
{text}
"""

REQUIREMENT_PROMPT = """You are a compliance analyst. Given the regulation summary and clauses, extract each obligation as a structured requirement.
For each requirement, provide: clause_id, obligation, deadline_days (if specified), threshold (if any), entity involved, confidence (0.0-1.0).

CITATION RULES (mandatory, Task 7 pilot gate):
- Every requirement MUST include:
  - "quote": the EXACT verbatim sentence(s) from the cited clause (copy, do not paraphrase);
  - "page": the page number where the quote appears (integer, or null if unknown);
  - "clause_id": the exact clause identifier (e.g. "2.1").
- A requirement whose quote does not appear verbatim in the canonical text is
  INVALID and will be rejected by the citation validator — it will persist only
  as a review error, never as an approved obligation.
- Classify deadlines deterministically:
  - retention/storage duties ("retain ... for at least 12 months", "maintain logs
    for a minimum period of ...") are RETENTION periods, never implementation
    due dates;
  - "within 30 days of X" is RELATIVE and MUST keep its anchor event X;
  - "quarterly"/"every month" is PERIODIC; calendar dates are ABSOLUTE.
- Note modal language (shall/must/should/may), exceptions ("unless", "except",
  "notwithstanding") and cross-references ("as per clause ...", "under section ...").

Summary:
{summary}

Clauses:
{clauses}

Context:
{context}

Return JSON matching this schema:
{schema}
"""

MAP_PROMPT = """You are a compliance implementation specialist. Convert each requirement into a concrete MAP (Measurable Action Point). Output a JSON array.

STRICT RULE: owner_department MUST be exactly one of these five strings (case-sensitive):
  "Compliance", "Risk", "IT", "Operations", "Audit"
Do NOT use any other department name. Do NOT invent new departments like Finance, Legal, HR, Technology, etc.

CRITICAL - DEADLINE PRESERVATION:
For each MAP, you MUST extract the EXACT deadline from the source clause text.
- If clause says "within 30 days" → deadline_days = 30
- If clause says "by 31 March 2025" → calculate days from regulation date
- If clause says "retain for 12 months" → deadline_days = 365
- If clause says "minimum period of 90 days" → deadline_days = 90
- Do NOT infer, calculate, or estimate deadlines. Use ONLY what is explicitly stated.
- If no deadline is mentioned in the clause, set deadline_days = null.

DEADLINE VALIDATION:
Cross-reference your extracted deadlines against these known entities from the document:
{deadline_entities}
Any MAP with a deadline not matching the above entities will be rejected.

For each MAP provide:
- description: what must be done
- owner_department: MUST be one of ["Compliance", "Risk", "IT", "Operations", "Audit"] — no other value accepted
- deadline_days: integer number of days from today, or null
- evidence_required: what proof of completion is needed
- confidence: float 0.0-1.0
- reasoning: why this MAP is needed and which clause requires it
- source_clauses: list of clause IDs

Requirements:
{requirements}

Similar historical MAPs for context:
{historical_context}

Return a JSON array of objects matching this schema:
{schema}
"""

DEPENDENCY_PROMPT = """You are a project dependency analyst. Given the generated MAPs, identify which MAPs depend on which others.
Common dependency chains in banks: Policy Update → Software Update → Training → Branch Rollout.

DEPENDENCY HEURISTICS (apply these rules):
1. CLAUSE HIERARCHY: Clause N.n (e.g., 4.2.1) typically depends on its parent N.1 (e.g., 4.1).
   The parent clause establishes the requirement; sub-clauses detail implementation.

2. TEMPORAL ORDER: If Clause A has deadline X days and Clause B has deadline Y days where X < Y,
   then A is likely a prerequisite for B (earlier deadlines must be met first).

3. SHARED ENTITIES: If two clauses share the same department, system, or role entity,
   they likely have a coordination dependency (same team must execute both).

4. REGULATORY FLOW: "Shall establish" → "Shall implement" → "Shall report" → "Shall review"
   creates a natural dependency chain. Look for these verb patterns.

5. CROSS-REFERENCES: If Clause A explicitly references Clause B (e.g., "as per clause 3.2"),
   then A depends on B.

Apply these heuristics when the LLM is uncertain. Explicit references in text take priority.

MAPs:
{maps}

Return JSON: {{"dependencies": [{{"map_index": 0, "depends_on_indices": [1]}}] }}
"""
