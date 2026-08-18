"""NextCall FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.database import Base, engine, ensure_runtime_schema
from app.core.rate_limit import limiter
from app.services.voice import VoiceProviderError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voxa")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import models so metadata is populated, then create tables.
    import app.models  # noqa: F401

    try:
        Base.metadata.create_all(bind=engine)
        ensure_runtime_schema()
        logger.info("%s API ready (%s)", settings.PROJECT_NAME, settings.ENVIRONMENT)
    except Exception:
        # Don't crash the whole function on cold start — log and serve /health
        # so deploy issues are visible in logs instead of a blank 500.
        logger.exception("Database init failed at startup")
    yield


# Hide interactive API docs & the OpenAPI schema in production to avoid
# disclosing the full API surface publicly.
_docs_enabled = not settings.is_production

app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    version="1.0.0",
    description="White-label AI voice agent platform API.",
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

app.state.limiter = limiter
# Global per-IP rate limiting (applies the limiter's default_limits) without
# touching individual route signatures.
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})


@app.exception_handler(VoiceProviderError)
async def voice_provider_error_handler(request: Request, exc: VoiceProviderError):
    # Surface upstream voice-provider failures as a clean JSON error. Handled
    # here (inside the CORS middleware) so the browser receives CORS headers
    # instead of failing with an opaque "Failed to fetch".
    logger.warning("Voice provider error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={"detail": str(exc) or "Voice provider request failed"},
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    # Log the precise field errors so 422s are debuggable from container logs.
    errors = jsonable_encoder(exc.errors())
    logger.warning("422 validation error on %s %s: %s", request.method, request.url.path, errors)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors},
    )


@app.get("/", tags=["health"])
def root():
    return {"name": settings.PROJECT_NAME, "status": "ok", "version": "1.0.0"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
