"""Vercel entrypoint — re-exports the FastAPI app from the app package."""

from app.main import app

__all__ = ["app"]
