"""Voice preview synthesis.

Generates short audio samples for the curated voice catalog so customers can
hear a voice before selecting it. Audio is produced via an internal TTS provider
and cached in-memory (the sample text is fixed per voice, so the bytes are
stable). The platform stays white-labeled — callers only ever see neutral voice
names and an ``audio/mpeg`` stream.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings
from app.services.voices import VOICE_CATALOG

logger = logging.getLogger("voxa.tts")

# Map curated catalog voices to internal TTS voices, by gender for a natural fit.
_FEMALE_POOL = ["nova", "shimmer"]
_MALE_POOL = ["onyx", "echo", "fable"]
_NEUTRAL = "alloy"

_SAMPLE_TEMPLATE = "Hi, I'm {name}. This is how I'll sound on your calls."

# voice_id -> mp3 bytes
_CACHE: dict[str, bytes] = {}


class TTSUnavailable(Exception):
    """Raised when no TTS provider is configured."""


def _resolve_internal_voice(voice_id: str, gender: str | None) -> str:
    pool = _FEMALE_POOL if gender == "female" else _MALE_POOL if gender == "male" else None
    if not pool:
        return _NEUTRAL
    # Deterministic pick so a given voice always sounds the same.
    return pool[sum(ord(c) for c in voice_id) % len(pool)]


def _catalog_voice(voice_id: str):
    return next((v for v in VOICE_CATALOG if v.id == voice_id), None)


async def synthesize_preview(voice_id: str) -> bytes:
    """Return mp3 bytes for a voice preview. Cached after first generation."""
    if voice_id in _CACHE:
        return _CACHE[voice_id]

    if not settings.OPENAI_API_KEY:
        raise TTSUnavailable("No TTS provider configured")

    voice = _catalog_voice(voice_id)
    name = voice.name if voice else voice_id
    gender = voice.gender if voice else None
    internal_voice = _resolve_internal_voice(voice_id, gender)
    text = _SAMPLE_TEMPLATE.format(name=name)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/audio/speech",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "tts-1",
                "voice": internal_voice,
                "input": text,
                "response_format": "mp3",
            },
        )
        if resp.status_code >= 400:
            logger.error("TTS error %s: %s", resp.status_code, resp.text[:300])
            raise TTSUnavailable(f"TTS provider error ({resp.status_code})")
        audio = resp.content

    _CACHE[voice_id] = audio
    return audio
