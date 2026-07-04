"""Voice provider factory.

Import ``voice_provider`` anywhere in the app to talk to the configured voice
infrastructure vendor through the vendor-neutral :class:`VoiceProvider` contract::

    from app.services.voice import voice_provider
    await voice_provider.create_assistant(agent)

The concrete vendor is selected by the ``VOICE_PROVIDER`` env var (default
``"vapi"``). Register new providers in :data:`_PROVIDERS`.
"""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.services.voice.base import VoiceProvider, VoiceProviderError
from app.services.voice.vapi_provider import VapiProvider

# provider slug -> factory. Add RetellProvider / BlandProvider here later.
_PROVIDERS: dict[str, type[VoiceProvider]] = {
    "vapi": VapiProvider,
}


@lru_cache
def get_voice_provider() -> VoiceProvider:
    slug = (settings.VOICE_PROVIDER or "vapi").lower()
    provider_cls = _PROVIDERS.get(slug)
    if provider_cls is None:
        raise ValueError(
            f"Unknown VOICE_PROVIDER '{slug}'. Available: {', '.join(_PROVIDERS)}"
        )
    return provider_cls()


#: Process-wide singleton used throughout the app.
voice_provider: VoiceProvider = get_voice_provider()

__all__ = ["VoiceProvider", "VoiceProviderError", "get_voice_provider", "voice_provider"]
