import os

import httpx

from app.config import settings


class LLMClient:
    def __init__(self, model: str = "qwen2.5:14b"):
        self.model = model
        self.url = settings.ollama_url

    def chat(self, messages: list[dict], temperature: float = 0.2, max_tokens: int = 2000) -> str:
        try:
            response = httpx.post(
                f"{self.url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": temperature, "num_predict": max_tokens},
                },
                timeout=120.0,
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
