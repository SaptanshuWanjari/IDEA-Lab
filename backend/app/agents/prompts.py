UNDERSTANDING_PROMPT = """You are a senior banking compliance analyst. Read the following regulation text and produce:
1. A plain-language summary in 2-3 paragraphs understandable by any bank employee.
2. A list of affected domains (IT, Risk, Compliance, Operations, Audit).

Text:
{text}
"""

REQUIREMENT_PROMPT = """You are a compliance analyst. Given the regulation summary and clauses, extract each obligation as a structured requirement.
For each requirement, provide: clause_id, obligation, deadline_days (if specified), threshold (if any), entity involved, confidence (0.0-1.0).

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

MAPs:
{maps}

Return JSON: {{"dependencies": [{{"map_index": 0, "depends_on_indices": [1]}}] }}
"""
