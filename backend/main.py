import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env no matter where uvicorn is launched from
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.uploads import router as uploads_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

app.include_router(uploads_router)

@app.get("/")
def health():
    return {"ok": True, "service": "vikami-cho-backend"}
