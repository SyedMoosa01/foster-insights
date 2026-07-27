from pathlib import Path
from typing import Annotated

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .analytics import process_datasets

app = FastAPI(title="Foster Insights Analytics API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).resolve().parents[2] / "public" / "data"


def _read_upload(file: UploadFile) -> pd.DataFrame:
    try:
        file.file.seek(0)
        return pd.read_csv(file.file, dtype=str, keep_default_na=True)
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail=f"Unable to read {file.filename}: {exc}"
        ) from exc


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/sample")
def sample() -> dict:
    try:
        return process_datasets(
            pd.read_csv(DATA_DIR / "child_level.csv", dtype=str),
            pd.read_csv(DATA_DIR / "placement_level.csv", dtype=str),
            pd.read_csv(DATA_DIR / "provider_level_updated.csv", dtype=str),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/process")
def process_uploads(
    child: Annotated[UploadFile, File(...)],
    placement: Annotated[UploadFile, File(...)],
    provider: Annotated[UploadFile, File(...)],
) -> dict:
    try:
        return process_datasets(
            _read_upload(child),
            _read_upload(placement),
            _read_upload(provider),
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}") from exc
