"""Catalogs that power the agent editor (models, transcribers, tools, …).

These mirror the options available in the underlying voice platform so the
customer-facing editor reaches feature parity, while staying white-labeled:
providers are named generically and the infra vendor is never surfaced.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class ModelOption:
    id: str            # provider-native model id (sent upstream)
    name: str          # display label
    provider: str      # infra model-provider slug (openai, anthropic, …)
    description: str = ""


@dataclass(frozen=True)
class TranscriberOption:
    id: str            # "<provider>/<model>" composite for the selector
    name: str
    provider: str      # deepgram, assembly-ai, …
    model: str         # nova-2, nova-3, best, …
    description: str = ""


@dataclass(frozen=True)
class ToolField:
    key: str
    label: str
    type: str = "text"          # text | textarea | number | select
    placeholder: str = ""
    required: bool = False
    options: tuple[str, ...] = ()


@dataclass(frozen=True)
class ToolSpec:
    id: str            # our tool type / handler key
    name: str
    description: str
    category: str
    # Provider-native tool type used when serializing to the assistant payload.
    vapi_type: Optional[str] = None
    fields: tuple[ToolField, ...] = ()


# ── Model providers ─────────────────────────────────────────────────────────
MODEL_CATALOG: list[ModelOption] = [
    # OpenAI (available out of the box)
    ModelOption("gpt-4o", "GPT-4o", "openai", "Most capable multimodal model."),
    ModelOption("gpt-4o-mini", "GPT-4o mini", "openai", "Fast and cost-efficient."),
    ModelOption("gpt-4.1", "GPT-4.1", "openai", "Flagship reasoning model."),
    ModelOption("gpt-4.1-mini", "GPT-4.1 mini", "openai", "Balanced speed and quality."),
    ModelOption("gpt-4.1-nano", "GPT-4.1 nano", "openai", "Ultra-low latency."),
    # Anthropic (requires a connected Anthropic integration)
    ModelOption("claude-3-5-sonnet-20241022", "Claude 3.5 Sonnet", "anthropic",
                "Strong reasoning and writing."),
    ModelOption("claude-3-5-haiku-20241022", "Claude 3.5 Haiku", "anthropic",
                "Fast, lightweight Claude."),
    # Google (requires a connected Google integration)
    ModelOption("gemini-2.0-flash", "Gemini 2.0 Flash", "google", "Fast Google model."),
    ModelOption("gemini-1.5-pro", "Gemini 1.5 Pro", "google", "High-context Google model."),
    # Groq (requires a connected Groq integration)
    ModelOption("llama-3.3-70b-versatile", "Llama 3.3 70B", "groq",
                "Open model on ultra-fast inference."),
]

MODEL_BY_ID: dict[str, ModelOption] = {m.id: m for m in MODEL_CATALOG}


# ── Transcribers ────────────────────────────────────────────────────────────
TRANSCRIBER_CATALOG: list[TranscriberOption] = [
    TranscriberOption("deepgram/nova-2", "Nova 2", "deepgram", "nova-2",
                      "Fast, accurate real-time transcription."),
    TranscriberOption("deepgram/nova-3", "Nova 3", "deepgram", "nova-3",
                      "Latest Deepgram model with best accuracy."),
    TranscriberOption("deepgram/nova-2-phonecall", "Nova 2 Phone", "deepgram",
                      "nova-2-phonecall", "Tuned for telephony audio."),
    TranscriberOption("assembly-ai/best", "AssemblyAI Best", "assembly-ai", "best",
                      "High-accuracy speech-to-text with diarization."),
]

TRANSCRIBER_BY_ID: dict[str, TranscriberOption] = {t.id: t for t in TRANSCRIBER_CATALOG}


# ── First message behavior ──────────────────────────────────────────────────
FIRST_MESSAGE_MODES = [
    {"id": "assistant-speaks-first", "name": "Assistant speaks first",
     "description": "The agent opens the call with your first message."},
    {"id": "assistant-speaks-first-with-model-generated-message",
     "name": "Assistant speaks first (generated)",
     "description": "The agent opens with a model-generated greeting."},
    {"id": "assistant-waits-for-user", "name": "Wait for the caller",
     "description": "The agent stays silent until the caller speaks."},
]
FIRST_MESSAGE_MODE_IDS = {m["id"] for m in FIRST_MESSAGE_MODES}


# ── Tools ───────────────────────────────────────────────────────────────────
PHONE = "Phone Call Tools"
ASSISTANT = "Assistant Tools"
INTEGRATIONS = "Integrations"

TOOL_CATALOG: list[ToolSpec] = [
    # Phone call tools
    ToolSpec("transfer_call", "Transfer Call",
             "Forward the caller to another number or agent.", PHONE, "transferCall",
             (ToolField("destination", "Transfer to (E.164 or SIP)", "text",
                        "+14155552671", True),)),
    ToolSpec("hang_up", "Hang Up", "End the call when appropriate.", PHONE, "endCall"),
    ToolSpec("leave_voicemail", "Leave Voicemail",
             "Detect voicemail and leave a message.", PHONE, "voicemail",
             (ToolField("message", "Voicemail message", "textarea",
                        "Sorry we missed you…"),)),
    ToolSpec("dtmf", "DTMF", "Send touch-tone keypad digits during a call.",
             PHONE, "dtmf"),
    ToolSpec("send_text", "Send Text", "Send an SMS to the caller.", PHONE, "sms",
             (ToolField("message", "Message template", "textarea",
                        "Thanks for calling!"),)),
    ToolSpec("sip_request", "SIP Request", "Send a SIP REFER/INFO request.",
             PHONE, None),
    # Assistant tools
    ToolSpec("handoff", "Handoff", "Hand the conversation to another agent.",
             ASSISTANT, "handoff",
             (ToolField("target_agent", "Target agent id", "text", "", False),)),
    ToolSpec("query", "Query", "Look up answers from the knowledge base.",
             ASSISTANT, "query"),
    # Integrations
    ToolSpec("api_request", "API Request", "Call an external HTTP API.",
             INTEGRATIONS, "apiRequest",
             (ToolField("url", "Endpoint URL", "text", "https://api.example.com", True),
              ToolField("method", "Method", "select", "", True,
                        ("GET", "POST", "PUT", "PATCH", "DELETE")))),
    ToolSpec("mcp", "MCP", "Connect a Model Context Protocol server.",
             INTEGRATIONS, "mcp",
             (ToolField("server_url", "MCP server URL", "text",
                        "https://mcp.example.com", True),)),
    ToolSpec("slack", "Slack", "Post messages to a Slack channel.",
             INTEGRATIONS, None,
             (ToolField("webhook_url", "Slack webhook URL", "text", "", True),)),
    ToolSpec("google_sheets", "Google Sheets", "Append call data to a spreadsheet.",
             INTEGRATIONS, None,
             (ToolField("spreadsheet_id", "Spreadsheet ID", "text", "", True),)),
]

TOOL_BY_ID: dict[str, ToolSpec] = {t.id: t for t in TOOL_CATALOG}
TOOL_CATEGORY_ORDER = [PHONE, ASSISTANT, INTEGRATIONS]


def model_catalog_dicts() -> list[dict[str, Any]]:
    return [asdict(m) for m in MODEL_CATALOG]


def transcriber_catalog_dicts() -> list[dict[str, Any]]:
    return [asdict(t) for t in TRANSCRIBER_CATALOG]


def tool_catalog_grouped() -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for spec in TOOL_CATALOG:
        entry = {
            "id": spec.id,
            "name": spec.name,
            "description": spec.description,
            "category": spec.category,
            "fields": [asdict(f) for f in spec.fields],
        }
        grouped.setdefault(spec.category, []).append(entry)
    return [
        {"category": cat, "tools": grouped[cat]}
        for cat in TOOL_CATEGORY_ORDER
        if cat in grouped
    ]
