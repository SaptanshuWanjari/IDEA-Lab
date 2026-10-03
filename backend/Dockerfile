FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev
COPY . .
ENV PATH="/app/.venv/bin:$PATH"
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
