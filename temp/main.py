from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import athletes, teams, tests, readiness

app = FastAPI(title="AfaSense Data Hub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(athletes.router, prefix="/api/athletes", tags=["Athletes"])
app.include_router(teams.router,    prefix="/api/teams",    tags=["Teams"])
app.include_router(tests.router,    prefix="/api/tests",    tags=["Tests"])
app.include_router(readiness.router,prefix="/api/readiness",tags=["Readiness"])

@app.get("/api/health")
def health():
    return {"status": "ok"}
