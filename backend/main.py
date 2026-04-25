from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import test_category_param

app = FastAPI(title="AfaSense API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test_category_param.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "AfaSense API is running"}