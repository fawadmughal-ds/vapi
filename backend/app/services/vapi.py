"""Internal Vapi integration layer.

This is the ONLY module that talks to Vapi. Nothing here is ever surfaced to
end users — the rest of the application treats Vapi purely as an internal voice
infrastructure provider. All public API responses use neutral terminology.

The client is intentionally defensive: if no API key is configured (e.g. local
development without Vapi credentials) it degrades gracefully and returns mock
identifiers so the rest of the platform remains fully functional.
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.exceptions import VoiceProviderError
from app.services.agent_catalog import MODEL_BY_ID, TRANSCRIBER_BY_ID
from app.services.voices import to_vapi_voice_id

logger = logging.getLogger("voxa.vapi")


def _slug_tool_name(value: str) -> str:
    """Coerce a tool name into Vapi's required ^[a-zA-Z0-9_-]{1,64}$ format."""
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "_", (value or "").strip()).strip("_")
    slug = slug[:64]
    return slug or "tool"


class VapiError(VoiceProviderError):
    """Raised when the upstream voice provider (Vapi) returns an error."""


class VapiClient:
    def __init__(self) -> None:
        self._api_key = settings.VAPI_API_KEY
        self._base_url = settings.VAPI_BASE_URL.rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
    )
    async def _request(self, method: str, path: str, **kwargs) -> dict[str, Any]:
        if not self.enabled:
            # Graceful degradation for environments without Vapi credentials.
            logger.warning("Vapi disabled (no API key); returning mock for %s %s", method, path)
            return {"id": f"mock_{uuid.uuid4().hex[:20]}", "_mock": True}

        url = f"{self._base_url}{path}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(method, url, headers=self._headers(), **kwargs)
            if resp.status_code >= 400:
                detail = resp.text
                try:
                    payload = resp.json()
                    message = payload.get("message")
                    if isinstance(message, list):
                        detail = "; ".join(str(part) for part in message)
                    elif isinstance(message, str):
                        detail = message
                except Exception:
                    pass
                logger.error("Vapi error %s: %s", resp.status_code, detail)
                raise VapiError(detail or f"Voice provider error ({resp.status_code})")
            if resp.status_code == 204 or not resp.content:
                return {}
            return resp.json()

    # ── Assistants ─────────────────────────────────────────────────────────
    def _model_config(self, agent, cfg: dict[str, Any]) -> dict[str, Any]:
        model_id = agent.model or "gpt-4o-mini"
        spec = MODEL_BY_ID.get(model_id)
        provider = cfg.get("model_provider") or (spec.provider if spec else "openai")
        return {
            "provider": provider,
            "model": model_id,
            "temperature": cfg.get("temperature", 0.7),
            "messages": [{"role": "system", "content": agent.system_prompt or ""}],
        }

    def _transcriber_config(self, agent, cfg: dict[str, Any]) -> dict[str, Any]:
        transcriber_id = cfg.get("transcriber")
        spec = TRANSCRIBER_BY_ID.get(transcriber_id) if transcriber_id else None
        provider = cfg.get("transcriber_provider") or (spec.provider if spec else "deepgram")
        model = cfg.get("transcriber_model") or (spec.model if spec else "nova-2")
        return {"provider": provider, "model": model, "language": agent.language or "en"}

    def _build_tools(self, agent) -> list[dict[str, Any]]:
        """Serialize the agent's tools into provider tool definitions.

        Well-known phone tools map to native provider tool types; everything else
        becomes a function tool routed to our webhook so the model can invoke it.
        """
        tools: list[dict[str, Any]] = []
        for tool in getattr(agent, "tools", None) or []:
            if not getattr(tool, "enabled", True):
                continue
            handler = tool.handler
            config = tool.parameters_schema or {}
            if handler == "hang_up":
                tools.append({"type": "endCall"})
            elif handler == "dtmf":
                tools.append({"type": "dtmf"})
            elif handler == "leave_voicemail":
                tools.append({"type": "voicemail"})
            elif handler == "transfer_call" and config.get("destination"):
                tools.append({
                    "type": "transferCall",
                    "destinations": [
                        {"type": "number", "number": config["destination"]}
                    ],
                })
            else:
                # Custom / integration tool → function the model can call.
                tools.append({
                    "type": "function",
                    "function": {
                        # Vapi requires ^[a-zA-Z0-9_-]{1,64}$ — prefer the handler
                        # slug and slugify anything else (names may have spaces).
                        "name": _slug_tool_name(handler or tool.name),
                        "description": tool.description or tool.name or handler,
                        "parameters": config.get("parameters")
                        or {"type": "object", "properties": {}},
                    },
                })
        return tools

    def _build_assistant_payload(self, agent) -> dict[str, Any]:
        """Translate an internal Agent into a Vapi assistant definition."""
        cfg = agent.configuration or {}
        model = self._model_config(agent, cfg)
        tools = self._build_tools(agent)
        if tools:
            model["tools"] = tools
        payload: dict[str, Any] = {
            "name": agent.name,
            "firstMessage": agent.first_message or f"Hello, you've reached {agent.name}.",
            "model": model,
            "transcriber": self._transcriber_config(agent, cfg),
        }
        mode = cfg.get("first_message_mode")
        if mode:
            payload["firstMessageMode"] = mode
        # Advanced call controls (optional).
        if cfg.get("silence_timeout_seconds"):
            payload["silenceTimeoutSeconds"] = int(cfg["silence_timeout_seconds"])
        if cfg.get("max_duration_seconds"):
            payload["maxDurationSeconds"] = int(cfg["max_duration_seconds"])
        if cfg.get("end_call_message"):
            payload["endCallMessage"] = cfg["end_call_message"]
        if cfg.get("end_call_phrases"):
            phrases = cfg["end_call_phrases"]
            if isinstance(phrases, str):
                phrases = [p.strip() for p in phrases.split(",") if p.strip()]
            if phrases:
                payload["endCallPhrases"] = phrases
        if cfg.get("background_sound"):
            payload["backgroundSound"] = cfg["background_sound"]
        if agent.voice_id:
            provider = agent.voice_provider or "vapi"
            # Vapi's built-in voice ids are case-sensitive; normalize ours.
            voice_id = (
                to_vapi_voice_id(agent.voice_id) if provider == "vapi" else agent.voice_id
            )
            payload["voice"] = {"provider": provider, "voiceId": voice_id}
        server = self._server_config()
        if server:
            payload["server"] = server
        return payload

    def _server_config(self) -> Optional[dict[str, Any]]:
        """Where Vapi should POST call events for assistants we create.

        Only attached when we have a publicly reachable base URL — Vapi cannot
        deliver webhooks to localhost, so we skip it in local dev to avoid
        configuring a dead endpoint. Set ``PUBLIC_BASE_URL`` to a public URL
        (e.g. an ngrok tunnel or your deployed host) to enable inbound events.
        """
        base = (settings.PUBLIC_BASE_URL or "").rstrip("/")
        if not base or "localhost" in base or "127.0.0.1" in base:
            return None
        server: dict[str, Any] = {
            "url": f"{base}{settings.API_V1_PREFIX}/webhooks/vapi"
        }
        if settings.VAPI_WEBHOOK_SECRET:
            server["secret"] = settings.VAPI_WEBHOOK_SECRET
        return server

    async def create_assistant(self, agent) -> str:
        data = await self._request(
            "POST", "/assistant", json=self._build_assistant_payload(agent)
        )
        return data.get("id", f"mock_{uuid.uuid4().hex[:20]}")

    async def update_assistant(self, assistant_id: str, agent) -> None:
        if not assistant_id:
            return
        await self._request(
            "PATCH", f"/assistant/{assistant_id}", json=self._build_assistant_payload(agent)
        )

    async def delete_assistant(self, assistant_id: str) -> None:
        if not assistant_id:
            return
        try:
            await self._request("DELETE", f"/assistant/{assistant_id}")
        except VapiError:
            logger.warning("Failed to delete assistant %s upstream", assistant_id)

    # ── Phone numbers ──────────────────────────────────────────────────────
    async def register_phone_number(self, e164_number: str, assistant_id: Optional[str]) -> str:
        body: dict[str, Any] = {"number": e164_number}
        if assistant_id:
            body["assistantId"] = assistant_id
        data = await self._request("POST", "/phone-number", json=body)
        return data.get("id", f"mock_{uuid.uuid4().hex[:20]}")

    async def _get_list(self, path: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """GET a collection endpoint and normalize the response to a list.

        Returns an empty list when no credentials are configured so callers can
        treat "nothing to sync" and "not enabled" identically.
        """
        if not self.enabled:
            return []
        url = f"{self._base_url}{path}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, headers=self._headers(), params=params)
            if resp.status_code >= 400:
                logger.error("Vapi GET %s error %s: %s", path, resp.status_code, resp.text)
                raise VapiError(f"Voice provider error ({resp.status_code})")
            data = resp.json()
            if isinstance(data, list):
                return data
            # Some endpoints wrap results under "results"/"data".
            if isinstance(data, dict):
                for key in ("results", "data", "items"):
                    if isinstance(data.get(key), list):
                        return data[key]
            return []

    async def list_phone_numbers(self) -> list[dict[str, Any]]:
        """Return every phone number that exists in the upstream org.

        Includes the free number Vapi grants each org plus any bought/imported
        numbers. Returns an empty list when no credentials are configured.
        """
        return await self._get_list("/phone-number")

    async def list_assistants(self) -> list[dict[str, Any]]:
        """Return every assistant (agent) that exists in the upstream org."""
        return await self._get_list("/assistant", {"limit": 1000})

    async def list_calls(self, limit: int = 1000) -> list[dict[str, Any]]:
        """Return recent calls from the upstream org (newest first)."""
        return await self._get_list("/call", {"limit": limit})

    async def list_credentials(self) -> list[dict[str, Any]]:
        """Return connected provider credentials in the upstream org."""
        return await self._get_list("/credential")

    async def list_files(self) -> list[dict[str, Any]]:
        """Return knowledge-base files that exist in the upstream org."""
        return await self._get_list("/file")

    async def create_phone_number(self, body: dict[str, Any]) -> dict[str, Any]:
        """Create/import a phone number with any supported provider payload.

        The caller builds the provider-specific body; this just forwards it and
        returns the created object (which includes the assigned ``number``).
        """
        data = await self._request("POST", "/phone-number", json=body)
        if data.get("_mock"):
            # No upstream configured — synthesize a plausible identifier so the
            # rest of the platform stays functional in local development.
            fallback = (
                body.get("number")
                or body.get("sipUri")
                or f"+1{body.get('numberDesiredAreaCode', '555')}"
                + f"{uuid.uuid4().int % 10_000_000:07d}"
            )
            data.setdefault("number", fallback)
        return data

    async def update_phone_number(self, phone_id: str, assistant_id: Optional[str]) -> None:
        if not phone_id:
            return
        await self._request(
            "PATCH", f"/phone-number/{phone_id}", json={"assistantId": assistant_id}
        )

    async def release_phone_number(self, phone_id: str) -> None:
        if not phone_id:
            return
        try:
            await self._request("DELETE", f"/phone-number/{phone_id}")
        except VapiError:
            logger.warning("Failed to release phone number %s upstream", phone_id)

    # ── Squads ─────────────────────────────────────────────────────────────
    def _build_squad_payload(self, name: str, members: list[tuple[str, str]]) -> dict[str, Any]:
        """``members`` is a list of (assistant_id, assistant_name) tuples.

        Each member can transfer to any other member (a fully-connected squad),
        which matches the common "primary answers, hands off as needed" pattern.
        """
        names = [n for _, n in members]
        squad_members = []
        for assistant_id, assistant_name in members:
            destinations = [
                {
                    "type": "assistant",
                    "assistantName": other,
                    "message": f"Transferring you to {other}.",
                }
                for other in names
                if other != assistant_name
            ]
            member: dict[str, Any] = {"assistantId": assistant_id}
            if destinations:
                member["assistantDestinations"] = destinations
            squad_members.append(member)
        return {"name": name, "members": squad_members}

    async def create_squad(self, name: str, members: list[tuple[str, str]]) -> str:
        data = await self._request(
            "POST", "/squad", json=self._build_squad_payload(name, members)
        )
        return data.get("id", f"mock_squad_{uuid.uuid4().hex[:16]}")

    async def update_squad(self, squad_id: str, name: str,
                           members: list[tuple[str, str]]) -> None:
        if not squad_id:
            return
        await self._request(
            "PATCH", f"/squad/{squad_id}", json=self._build_squad_payload(name, members)
        )

    async def delete_squad(self, squad_id: str) -> None:
        if not squad_id:
            return
        try:
            await self._request("DELETE", f"/squad/{squad_id}")
        except VapiError:
            logger.warning("Failed to delete squad %s upstream", squad_id)

    async def list_squads(self) -> list[dict[str, Any]]:
        return await self._get_list("/squad")

    # ── Calls ──────────────────────────────────────────────────────────────
    async def create_outbound_call(
        self, assistant_id: str, to_number: str, phone_number_id: Optional[str]
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "assistantId": assistant_id,
            "customer": {"number": to_number},
        }
        if phone_number_id:
            body["phoneNumberId"] = phone_number_id
        return await self._request("POST", "/call", json=body)

    # ── Provider credentials ───────────────────────────────────────────────
    async def create_credential(
        self, infra_provider: str, api_key: str, name: Optional[str] = None
    ) -> str:
        """Register a third-party provider credential with the infra provider.

        Returns the upstream credential id (or a mock id when running without
        infra credentials configured).
        """
        body: dict[str, Any] = {"provider": infra_provider, "apiKey": api_key}
        if name:
            body["name"] = name
        data = await self._request("POST", "/credential", json=body)
        return data.get("id", f"mock_cred_{uuid.uuid4().hex[:16]}")

    async def delete_credential(self, credential_id: str) -> None:
        if not credential_id:
            return
        try:
            await self._request("DELETE", f"/credential/{credential_id}")
        except VapiError:
            logger.warning("Failed to delete credential %s upstream", credential_id)

    # ── Files / knowledge base ─────────────────────────────────────────────
    async def upload_file(self, file_name: str, content: bytes, content_type: str) -> str:
        if not self.enabled:
            return f"mock_file_{uuid.uuid4().hex[:16]}"
        url = f"{self._base_url}/file"
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {self._api_key}"},
                files={"file": (file_name, content, content_type)},
            )
            if resp.status_code >= 400:
                raise VapiError(f"Voice provider file upload failed ({resp.status_code})")
            return resp.json().get("id", f"mock_file_{uuid.uuid4().hex[:16]}")


vapi_client = VapiClient()
