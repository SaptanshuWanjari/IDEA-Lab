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

MAP_PROMPT = """You are a compliance implementation specialist. Convert each requirement into a concrete MAP (Measurable Action Point).
For each MAP: description, owner_department (Compliance/Risk/IT/Operations/Audit), deadline_days, evidence_required, confidence (0.0-1.0), reasoning (explain why this MAP is needed and which clause requires it), source_clauses (list of clause IDs).

Requirements:
{requirements}

Available departments:
{departments}

Similar historical MAPs:
{historical_context}

Return JSON matching this schema:
{schema}
"""

DEPENDENCY_PROMPT = """You are a project dependency analyst. Given the generated MAPs, identify which MAPs depend on which others.
Common dependency chains in banks: Policy Update → Software Update → Training → Branch Rollout.

MAPs:
{maps}

Return JSON: {{"dependencies": [{{"map_index": 0, "depends_on_indices": [1]}}] }}
"""
