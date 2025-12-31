from __future__ import annotations
import os, io, uuid
from datetime import datetime, timezone
from typing import Optional

import boto3
from botocore.config import Config
from fastapi import APIRouter, Body, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from PIL import Image, ImageOps
from pathlib import Path
from dotenv import load_dotenv

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"  # backend/.env
load_dotenv(ENV_PATH, override=True)
print("UPLOADS.PY AFTER DOTENV: R2_ACCOUNT_ID=", bool(os.getenv("R2_ACCOUNT_ID")))
print("UPLOADS.PY BOOT: R2_BUCKET=", os.getenv("R2_BUCKET"))

MAX_BYTES_EACH = 5 * 1024 * 1024
ALLOWED_CT = {"image/jpeg", "image/png", "image/webp"}
RAW_PREFIX = "raw"
PUB_PREFIX = "public"

def _now_utc():
    return datetime.now(timezone.utc)

def require_api_key(x_api_key: Optional[str] = Header(default=None, alias="x-api-key")):
    expected = os.getenv("API_KEY", "dev-123")
    if not x_api_key or x_api_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

def _r2_client():
    endpoint = (os.getenv("R2_ENDPOINT") or "").strip()
    access_key = (os.getenv("R2_ACCESS_KEY_ID") or "").strip()
    secret = (os.getenv("R2_SECRET_ACCESS_KEY") or "").strip()
    if not endpoint or not access_key or not secret:
        print(
            "R2 DEBUG:",
            "R2_ENDPOINT=", repr(os.getenv("R2_ENDPOINT")),
            "R2_ACCESS_KEY_ID=", bool(os.getenv("R2_ACCESS_KEY_ID")),
            "R2_SECRET_ACCESS_KEY=", bool(os.getenv("R2_SECRET_ACCESS_KEY")),
            "R2_BUCKET=", bool(os.getenv("R2_BUCKET")),
            "R2_PUBLIC_BASE=", bool(os.getenv("R2_PUBLIC_BASE")),
        )
        raise RuntimeError("Missing R2 env vars")
    if not endpoint.startswith("http"):
        raise RuntimeError(f"Bad R2_ENDPOINT (no scheme): {endpoint!r}")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret,
        region_name=os.getenv("R2_REGION", "auto"),
        config=Config(signature_version="s3v4"),
    )

def _bucket():
    b = os.getenv("R2_BUCKET")
    if not b:
        raise RuntimeError("Missing R2_BUCKET")
    return b

def _public_base():
    base = os.getenv("R2_PUBLIC_BASE")
    if not base:
        raise RuntimeError("Missing R2_PUBLIC_BASE")
    return base.rstrip("/")

def _ext_for_ct(ct: str) -> str:
    return {"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[ct]

class PresignIn(BaseModel):
    filename: str
    content_type: str
    bytes: int = Field(..., ge=1)

class PresignOut(BaseModel):
    upload_url: str
    raw_key: str
    content_type: str

class CommitIn(BaseModel):
    post_id: str
    raw_key: str

class CommitOut(BaseModel):
    status: str
    url_original: str
    url_thumb: str
    width: int
    height: int
    bytes: int
    created_at: str

def _sanitize_to_webp(b: bytes) -> tuple[bytes, int, int]:
    with Image.open(io.BytesIO(b)) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        w, h = im.size
        out = io.BytesIO()
        im.save(out, format="WEBP", quality=82, method=6)  # EXIF stripped by re-encode
        return out.getvalue(), w, h

def _thumb_webp(b: bytes, max_side: int = 640) -> bytes:
    with Image.open(io.BytesIO(b)) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        im.thumbnail((max_side, max_side))
        out = io.BytesIO()
        im.save(out, format="WEBP", quality=78, method=6)
        return out.getvalue()

@router.post("/presign", response_model=PresignOut, dependencies=[Depends(require_api_key)])
def presign(payload: PresignIn = Body(...)):
    ct = (payload.content_type or "").lower().strip()
    if ct not in ALLOWED_CT:
        raise HTTPException(status_code=400, detail=f"Unsupported content_type: {ct}")
    if payload.bytes > MAX_BYTES_EACH:
        raise HTTPException(status_code=400, detail=f"File too large (max {MAX_BYTES_EACH} bytes)")

    key = f"{RAW_PREFIX}/{uuid.uuid4().hex}.{_ext_for_ct(ct)}"
    s3 = _r2_client()
    bucket = _bucket()

    upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": ct},
            ExpiresIn=300,
        )

    return PresignOut(upload_url=upload_url, raw_key=key, content_type=ct)

@router.post("/commit", response_model=CommitOut, dependencies=[Depends(require_api_key)])
def commit(payload: CommitIn = Body(...)):
    s3 = _r2_client()
    bucket = _bucket()

    try:
        obj = s3.get_object(Bucket=bucket, Key=payload.raw_key)
        raw = obj["Body"].read()
    except Exception:
        raise HTTPException(status_code=404, detail="Raw upload not found")
    
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_BYTES_EACH:
        raise HTTPException(status_code=400, detail="File too large")
    
    try:
        pub_bytes, w, h = _sanitize_to_webp(raw)
        thumb_bytes = _thumb_webp(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    image_id = uuid.uuid4().hex
    pub_key = f"{PUB_PREFIX}/showoff/{payload.post_id}/{image_id}.webp"
    th_key  = f"{PUB_PREFIX}/showoff/{payload.post_id}/{image_id}_thumb.webp"

    s3.put_object(Bucket=bucket, Key=pub_key, Body=pub_bytes, ContentType="image/webp",
                  CacheControl="public, max-age=31536000, immutable")
    s3.put_object(Bucket=bucket, Key=th_key, Body=thumb_bytes, ContentType="image/webp",
                  CacheControl="public, max-age=31536000, immutable")

    # delete raw to keep private area clean
    try: s3.delete_object(Bucket=bucket, Key=payload.raw_key)
    except Exception: pass

    base = _public_base()
    return CommitOut(
        status="OK",
        url_original=f"{base}/public/showoff/{payload.post_id}/{image_id}.webp",
        url_thumb=f"{base}/public/showoff/{payload.post_id}/{image_id}_thumb.webp",
        width=w,
        height=h,
        bytes=len(pub_bytes),
        created_at=_now_utc().isoformat(),
    )
