import logging
import os

import httpx

from app.config import settings

_llm_log = logging.getLogger(__name__)


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
                        "options": {"temperature": temperature, "num_predict": max_tokens},
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
