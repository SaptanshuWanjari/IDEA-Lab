from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.seed import seed
        await seed()

        from app.graph.client import GraphClient
        GraphClient().ensure_schema()
    except Exception:
        pass

    yield


from app.routers import auth, maps, regulations

app = FastAPI(title="PravahOS", version="0.1.0", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(regulations.router)
app.include_router(maps.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
