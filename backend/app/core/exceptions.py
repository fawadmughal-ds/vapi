"""Shared exception types.

Kept in a dependency-free leaf module so any layer (low-level provider clients,
the provider abstraction, the API layer) can raise/catch these without creating
import cycles.
"""

from __future__ import annotations


class VoiceProviderError(Exception):
    """Raised when the upstream voice infrastructure provider returns an error.

    Concrete providers (e.g. Vapi) raise a subclass; the API layer converts this
    into a clean ``502`` response with CORS headers.
    """
