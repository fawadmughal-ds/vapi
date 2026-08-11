"""Vapi implementation of the :class:`VoiceProvider` contract.

This is a thin adapter over :class:`app.services.vapi.VapiClient` (the low-level
HTTP client that is the ONLY module allowed to talk to Vapi). Keeping the adapter
separate from the interface means a future ``RetellProvider`` / ``BlandProvider``
can be dropped in without changing any business logic.
"""

from __future__ import annotations

from typing import Any, Optional

from app.services.vapi import vapi_client
from app.services.voice.base import VoiceProvider


class VapiProvider(VoiceProvider):
    name = "vapi"

    def __init__(self) -> None:
        self._client = vapi_client

    @property
    def enabled(self) -> bool:
        return self._client.enabled

    async def list_assistants(self) -> list[dict[str, Any]]:
        return await self._client.list_assistants()

    async def create_assistant(self, agent) -> str:
        return await self._client.create_assistant(agent)

    async def update_assistant(self, assistant_id: str, agent) -> None:
        await self._client.update_assistant(assistant_id, agent)

    async def delete_assistant(self, assistant_id: str) -> None:
        await self._client.delete_assistant(assistant_id)

    async def list_phone_numbers(self) -> list[dict[str, Any]]:
        return await self._client.list_phone_numbers()

    async def create_phone_number(self, body: dict[str, Any]) -> dict[str, Any]:
        return await self._client.create_phone_number(body)

    async def update_phone_number(self, phone_id: str, assistant_id: Optional[str]) -> None:
        await self._client.update_phone_number(phone_id, assistant_id)

    async def release_phone_number(self, phone_id: str) -> None:
        await self._client.release_phone_number(phone_id)

    async def create_squad(self, name: str, members: list[tuple[str, str]]) -> str:
        return await self._client.create_squad(name, members)

    async def update_squad(self, squad_id: str, name: str,
                           members: list[tuple[str, str]]) -> None:
        await self._client.update_squad(squad_id, name, members)

    async def delete_squad(self, squad_id: str) -> None:
        await self._client.delete_squad(squad_id)

    async def list_squads(self) -> list[dict[str, Any]]:
        return await self._client.list_squads()

    async def list_calls(self, limit: int = 1000) -> list[dict[str, Any]]:
        return await self._client.list_calls(limit)

    async def create_outbound_call(
        self, assistant_id: str, to_number: str, phone_number_id: Optional[str]
    ) -> dict[str, Any]:
        return await self._client.create_outbound_call(
            assistant_id, to_number, phone_number_id
        )

    async def list_credentials(self) -> list[dict[str, Any]]:
        return await self._client.list_credentials()

    async def create_credential(
        self, infra_provider: str, api_key: str, name: Optional[str] = None
    ) -> str:
        return await self._client.create_credential(infra_provider, api_key, name=name)

    async def delete_credential(self, credential_id: str) -> None:
        await self._client.delete_credential(credential_id)

    async def upload_file(self, file_name: str, content: bytes, content_type: str) -> str:
        return await self._client.upload_file(file_name, content, content_type)

    async def list_files(self) -> list[dict[str, Any]]:
        return await self._client.list_files()
