"""Catalog of provider integrations the platform admin can connect.

Each entry maps a customer-facing provider to the slug expected by the underlying
voice infrastructure provider when creating a credential. The platform stays
white-labeled: these are third-party AI providers, never the infra vendor itself.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProviderSpec:
    id: str
    name: str
    description: str
    category: str
    # Slug used by the infrastructure provider's credential API.
    infra_provider: str
    auth_type: str = "api_key"


VOICE = "Voice Providers"
MODEL = "Model Providers"
TRANSCRIBER = "Transcription"
STORAGE = "Storage"
TOOLS = "Tools & Data"

PROVIDER_CATALOG: list[ProviderSpec] = [
    # ── Voice providers ────────────────────────────────────────────────
    ProviderSpec("elevenlabs", "ElevenLabs",
                 "AI voice cloning and generation with natural speech synthesis.",
                 VOICE, "11labs"),
    ProviderSpec("cartesia", "Cartesia",
                 "Lightning-fast text-to-speech with ultra-low latency.",
                 VOICE, "cartesia"),
    ProviderSpec("playht", "PlayHT",
                 "High-quality AI voice generation with custom voice cloning.",
                 VOICE, "playht"),
    ProviderSpec("rime", "Rime AI",
                 "Realistic text-to-speech with emotional voice control.",
                 VOICE, "rime-ai"),
    ProviderSpec("smallestai", "Smallest AI",
                 "Ultra-fast, low-latency voice synthesis for real-time apps.",
                 VOICE, "smallest-ai"),
    ProviderSpec("neuphonic", "Neuphonic",
                 "Natural-sounding text-to-speech with emotional AI.",
                 VOICE, "neuphonic"),
    ProviderSpec("hume", "Hume",
                 "Emotionally intelligent AI voices with expressive speech.",
                 VOICE, "hume"),
    ProviderSpec("lmnt", "LMNT",
                 "Real-time AI voice synthesis optimized for conversational AI.",
                 VOICE, "lmnt"),
    ProviderSpec("azure_speech", "Azure Speech",
                 "Enterprise text-to-speech and speech-to-text by Microsoft.",
                 VOICE, "azure"),
    # ── Transcription ──────────────────────────────────────────────────
    ProviderSpec("deepgram", "Deepgram",
                 "Real-time speech recognition with low latency.",
                 TRANSCRIBER, "deepgram"),
    ProviderSpec("assembly", "AssemblyAI",
                 "Accurate speech-to-text with speaker diarization.",
                 TRANSCRIBER, "assembly-ai"),
    # ── Model providers ────────────────────────────────────────────────
    ProviderSpec("openai", "OpenAI",
                 "State-of-the-art GPT and o-series models.",
                 MODEL, "openai"),
    ProviderSpec("anthropic", "Anthropic",
                 "Claude series models focused on safe, helpful AI.",
                 MODEL, "anthropic"),
    ProviderSpec("google", "Google",
                 "Gemini series models for rich AI understanding.",
                 MODEL, "google"),
    ProviderSpec("azure_openai", "Azure OpenAI",
                 "Azure-hosted OpenAI models with enterprise governance.",
                 MODEL, "azure-openai"),
    ProviderSpec("groq", "Groq",
                 "High-performance inference for open models.",
                 MODEL, "groq"),
    ProviderSpec("xai", "xAI",
                 "Grok series models with real-time knowledge.",
                 MODEL, "xai"),
    ProviderSpec("mistral", "Mistral",
                 "Efficient open-weight models from Mistral.",
                 MODEL, "mistral"),
    ProviderSpec("cerebras", "Cerebras",
                 "Ultra-fast inference on Cerebras hardware.",
                 MODEL, "cerebras"),
    # ── Tools & data ───────────────────────────────────────────────────
    ProviderSpec("google_sheets", "Google Sheets",
                 "Read and write call data to spreadsheets.",
                 TOOLS, "google.sheets", auth_type="oauth"),
    ProviderSpec("make", "Make",
                 "Automate workflows triggered by call events.",
                 TOOLS, "make"),
    ProviderSpec("gohighlevel", "GoHighLevel",
                 "Sync leads and contacts with your CRM.",
                 TOOLS, "gohighlevel"),
    # ── Storage ────────────────────────────────────────────────────────
    ProviderSpec("aws_s3", "AWS S3",
                 "Store recordings in your own S3 bucket.",
                 STORAGE, "s3", auth_type="aws"),
    ProviderSpec("gcp_storage", "Google Cloud Storage",
                 "Store recordings in a GCS bucket.",
                 STORAGE, "gcp", auth_type="gcp"),
]

CATALOG_BY_ID: dict[str, ProviderSpec] = {p.id: p for p in PROVIDER_CATALOG}

# Category display order.
CATEGORY_ORDER = [VOICE, MODEL, TRANSCRIBER, TOOLS, STORAGE]


def connected_provider_ids(db) -> set[str]:
    """Platform-level providers that are currently connected."""
    from sqlalchemy import select

    from app.models.integration import Integration

    return {i.provider for i in db.scalars(select(Integration)).all()}


def tenant_entitlement_rows(db, user_id: str):
    from sqlalchemy import select

    from app.models.tenant_integration import TenantIntegrationEntitlement

    return db.scalars(
        select(TenantIntegrationEntitlement).where(
            TenantIntegrationEntitlement.user_id == user_id
        )
    ).all()


def allowed_provider_ids(db, user_id: str) -> set[str]:
    """Providers a tenant may use.

    Default policy (no entitlement rows): **allow all platform-connected**
    providers — existing tenants keep working without admin setup.

    Once the admin creates any entitlement row for a tenant, only providers
    with ``enabled=True`` are allowed (explicit opt-in per provider).
    """
    connected = connected_provider_ids(db)
    rows = tenant_entitlement_rows(db, user_id)
    if not rows:
        return connected
    return {r.provider_id for r in rows if r.enabled} & connected


def provider_info_for_tenant(db, user_id: str) -> list[ProviderCategory]:
    """Tenant-facing list of integrations they are entitled to use."""
    from app.schemas.integration import ProviderCategory, ProviderInfo

    allowed = allowed_provider_ids(db, user_id)
    connected = connected_provider_ids(db)
    grouped: dict[str, list[ProviderInfo]] = {}
    for spec in PROVIDER_CATALOG:
        if spec.id not in allowed:
            continue
        grouped.setdefault(spec.category, []).append(
            ProviderInfo(
                id=spec.id,
                name=spec.name,
                description=spec.description,
                category=spec.category,
                auth_type=spec.auth_type,
                connected=spec.id in connected,
            )
        )
    ordered: list[ProviderCategory] = []
    for category in CATEGORY_ORDER:
        if category in grouped:
            ordered.append(ProviderCategory(category=category, providers=grouped[category]))
    for category, providers in grouped.items():
        if category not in CATEGORY_ORDER:
            ordered.append(ProviderCategory(category=category, providers=providers))
    return ordered


def admin_tenant_entitlements(db, user_id: str) -> list[TenantProviderEntitlement]:
    """Admin view: every connected platform provider with enabled flag for a tenant."""
    from app.schemas.integration import TenantProviderEntitlement

    connected = connected_provider_ids(db)
    rows = {r.provider_id: r for r in tenant_entitlement_rows(db, user_id)}
    explicit = bool(rows)
    items: list[TenantProviderEntitlement] = []
    for spec in PROVIDER_CATALOG:
        if spec.id not in connected:
            continue
        row = rows.get(spec.id)
        if explicit:
            enabled = bool(row and row.enabled)
        else:
            enabled = True
        items.append(
            TenantProviderEntitlement(
                provider_id=spec.id,
                name=spec.name,
                category=spec.category,
                enabled=enabled,
            )
        )
    return items
