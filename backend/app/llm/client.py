import hashlib
import logging
import os
from typing import Optional

import httpx

from app.config import settings

_llm_log = logging.getLogger(__name__)


def hash_text(value: str | None) -> str:
    """SHA-256 hex of LLM input/output text for provenance records."""
    return hashlib.sha256((value or "").encode("utf-8")).hexdigest()


def record_ai_run(
    *,
    stage: str,
    prompt_version: str,
    input_text: str = "",
    output_text: str = "",
    model_id: str = "unknown",
    provider: str = "ollama",
    retrieval_chunk_ids: Optional[list] = None,
    retrieval_manifest: Optional[dict] = None,
    validator_result: Optional[dict] = None,
    reviewer_outcome: Optional[str] = None,
    correlation_id: Optional[str] = None,
    regulation_version_id: Optional[str] = None,
    bank_id: Optional[str] = None,
    legal_entity_id: Optional[str] = None,
):
    """Persist-free AIRun factory: builds the provenance record for one LLM stage.

    Callers persist the returned ``AIRun`` (or forward it to a recorder).
    Never calls a model — safe for unit tests.
    """
    from app.models.ai_run import AIRun

    manifest = dict(retrieval_manifest or {})
    manifest.setdefault("chunk_ids", [str(c) for c in (retrieval_chunk_ids or [])])
    return AIRun(
        stage=stage,
        model_id=model_id,
        provider=provider,
        prompt_version=prompt_version,
        retrieval_manifest=manifest,
        input_hash=hash_text(input_text),
        output_hash=hash_text(output_text),
        validator_result=validator_result,
        reviewer_outcome=reviewer_outcome,
        correlation_id=correlation_id,
        regulation_version_id=regulation_version_id,
        bank_id=bank_id,
        legal_entity_id=legal_entity_id,
    )


class LLMClient:
    def __init__(self, model: str | None = None):
        self.model = model or settings.ollama_chat_model
        self.url = settings.ollama_url

    def chat(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        temperature = settings.ollama_chat_temperature if temperature is None else temperature
        max_tokens = settings.ollama_chat_max_tokens if max_tokens is None else max_tokens
        import time

        for attempt in range(4):
            try:
                response = httpx.post(
                    f"{self.url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {"temperature": temperature, "num_predict": max_tokens, "think": False},
                    },
                    timeout=settings.ollama_chat_timeout,
                )
                response.raise_for_status()
                payload = response.json()
                content = payload.get("message", {}).get("content", "")
                done_reason = payload.get("done_reason")
                thinking_len = len(payload.get("message", {}).get("thinking", ""))
                print(f"OLLAMA {self.model} len={len(content)} reason={done_reason} error={payload.get('error')} thinking_len={thinking_len}", flush=True)
                if done_reason == "length":
                    _llm_log.warning(
                        "OLLAMA %s hit token limit (num_predict=%s): content_len=%d, thinking_len=%d. "
                        "Increase OLLAMA_CHAT_MAX_TOKENS if output is truncated.",
                        self.model, max_tokens, len(content), thinking_len,
                    )
                if not content and payload.get("error"):
                    raise RuntimeError(f"Ollama error: {payload['error']}")
                return content
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and attempt < 3:
                    sleep_time = 2 ** attempt * 5  # 5s, 10s, 20s
                    _llm_log.warning("Rate limited (429). Retrying in %ds...", sleep_time)
                    time.sleep(sleep_time)
                    continue
                if os.getenv("OPENAI_API_KEY"):
                    return self._openai_chat(messages, temperature, max_tokens)
                raise e
            except Exception as e:
                if os.getenv("OPENAI_API_KEY"):
                    return self._openai_chat(messages, temperature, max_tokens)
                raise e
            if os.getenv("OPENAI_API_KEY"):
                return self._openai_chat(messages, temperature, max_tokens)
            raise e

    def _openai_chat(self, messages: list[dict], temperature: float, max_tokens: int) -> str:
        import openai

        client = openai.OpenAI()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
