import os

import httpx

from app.config import settings


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
            return response.json()["message"]["content"]
        except Exception as e:
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
