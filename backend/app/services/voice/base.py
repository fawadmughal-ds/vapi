"""Voice provider abstraction.

Business logic depends only on the :class:`VoiceProvider` interface, never on a
concrete vendor. This is the seam that lets us replace Vapi later (Retell, Bland,
a custom carrier, …) without touching routes or services.

Every concrete provider (see :mod:`app.services.voice.vapi_provider`) subclasses
this and raises :class:`VoiceProviderError` on upstream failures. The API layer
converts that into a clean ``502`` response.
"""

from __future__ import annotations

import abc
from typing import Any, Optional

from app.core.exceptions import VoiceProviderError

__all__ = ["VoiceProvider", "VoiceProviderError"]


class VoiceProvider(abc.ABC):
    """Vendor-neutral contract for voice infrastructure.

    Implementations own ALL communication with the upstream vendor. Identifiers
    returned here (assistant id, phone number id, call id, credential id, file
    id) are opaque to the rest of the platform and stored against our own rows.
    """

    #: Short slug identifying the concrete provider (e.g. ``"vapi"``).
    name: str = "base"

    @property
    @abc.abstractmethod
    def enabled(self) -> bool:
        """True when the provider is configured with real credentials."""

    # ── Assistants (a.k.a. agents upstream) ─────────────────────────────────
    @abc.abstractmethod
    async def list_assistants(self) -> list[dict[str, Any]]:
        """Return all assistants that exist upstream (for import/sync)."""

    @abc.abstractmethod
    async def create_assistant(self, agent) -> str:
        """Create an upstream assistant from an internal ``Agent``; return its id."""

    @abc.abstractmethod
    async def update_assistant(self, assistant_id: str, agent) -> None:
        """Push internal ``Agent`` changes to the upstream assistant."""

    @abc.abstractmethod
    async def delete_assistant(self, assistant_id: str) -> None:
        """Delete the upstream assistant (best-effort)."""

    # ── Phone numbers ───────────────────────────────────────────────────────
    @abc.abstractmethod
    async def list_phone_numbers(self) -> list[dict[str, Any]]:
        """Return all numbers that exist upstream (for import/sync)."""

    @abc.abstractmethod
    async def create_phone_number(self, body: dict[str, Any]) -> dict[str, Any]:
        """Provision/import a number. ``body`` is the provider-native payload
        built by :mod:`app.services.phone_numbers`. Returns the created object
        (must include ``number`` and ``id``)."""

    @abc.abstractmethod
    async def update_phone_number(self, phone_id: str, assistant_id: Optional[str]) -> None:
        """Attach/detach an assistant to a provisioned number."""

    @abc.abstractmethod
    async def release_phone_number(self, phone_id: str) -> None:
        """Release/delete a provisioned number (best-effort)."""

    # ── Squads ───────────────────────────────────────────────────────────────
    @abc.abstractmethod
    async def create_squad(self, name: str, members: list[tuple[str, str]]) -> str:
        """Create a squad from (assistant_id, assistant_name) members; return id."""

    @abc.abstractmethod
    async def update_squad(self, squad_id: str, name: str,
                           members: list[tuple[str, str]]) -> None:
        """Update an existing squad's members."""

    @abc.abstractmethod
    async def delete_squad(self, squad_id: str) -> None:
        """Delete a squad (best-effort)."""

    @abc.abstractmethod
    async def list_squads(self) -> list[dict[str, Any]]:
        """Return all squads upstream (for import/sync)."""

    # ── Calls ───────────────────────────────────────────────────────────────
    @abc.abstractmethod
    async def list_calls(self, limit: int = 1000) -> list[dict[str, Any]]:
        """Return recent calls from upstream (for import/sync)."""

    @abc.abstractmethod
    async def create_outbound_call(
        self, assistant_id: str, to_number: str, phone_number_id: Optional[str]
    ) -> dict[str, Any]:
        """Start an outbound call; returns the upstream call object."""

    # ── Provider credentials (third-party keys the admin connects) ──────────
    @abc.abstractmethod
    async def list_credentials(self) -> list[dict[str, Any]]:
        """Return connected provider credentials upstream (for import/sync)."""

    @abc.abstractmethod
    async def create_credential(
        self, infra_provider: str, api_key: str, name: Optional[str] = None
    ) -> str:
        """Register a third-party provider key upstream; return its credential id."""

    @abc.abstractmethod
    async def delete_credential(self, credential_id: str) -> None:
        """Delete a stored provider credential (best-effort)."""

    # ── Knowledge base files ────────────────────────────────────────────────
    @abc.abstractmethod
    async def upload_file(self, file_name: str, content: bytes, content_type: str) -> str:
        """Upload a knowledge-base file upstream; return its file id."""
