"""Curated, white-labeled voice catalog presented to customers.

Voice ids map to upstream provider voices but are presented under neutral,
branded names so customers never see the underlying provider specifics.
"""

from app.schemas.agent import VoiceOption

# Only voices that Vapi currently supports for NEW assistants. Legacy voices
# (Hana, Paige, Spencer, Cole, Harry, Kylie, Lily, Neha) are phased out and
# rejected on create, so they are intentionally excluded.
VOICE_CATALOG: list[VoiceOption] = [
    # Male
    VoiceOption(id="elliot", name="Elliot", provider="vapi", language="en", gender="male"),
    VoiceOption(id="kai", name="Kai", provider="vapi", language="en", gender="male"),
    VoiceOption(id="rohan", name="Rohan", provider="vapi", language="en", gender="male"),
    VoiceOption(id="nico", name="Nico", provider="vapi", language="en", gender="male"),
    VoiceOption(id="leo", name="Leo", provider="vapi", language="en", gender="male"),
    VoiceOption(id="dan", name="Dan", provider="vapi", language="en", gender="male"),
    VoiceOption(id="neil", name="Neil", provider="vapi", language="en", gender="male"),
    VoiceOption(id="godfrey", name="Godfrey", provider="vapi", language="en", gender="male"),
    # Female
    VoiceOption(id="savannah", name="Savannah", provider="vapi", language="en", gender="female"),
    VoiceOption(id="emma", name="Emma", provider="vapi", language="en", gender="female"),
    VoiceOption(id="layla", name="Layla", provider="vapi", language="en", gender="female"),
    VoiceOption(id="mia", name="Mia", provider="vapi", language="en", gender="female"),
    VoiceOption(id="zoe", name="Zoe", provider="vapi", language="en", gender="female"),
    VoiceOption(id="clara", name="Clara", provider="vapi", language="en", gender="female"),
    VoiceOption(id="naina", name="Naina", provider="vapi", language="en", gender="female"),
    VoiceOption(id="tara", name="Tara", provider="vapi", language="en", gender="female"),
]

# Our catalog ids are lowercase/stable, but Vapi's built-in voice ids are
# case-sensitive PascalCase (e.g. "Elliot"). The display ``name`` already holds
# the exact Vapi id, so use it when addressing Vapi.
_VAPI_VOICE_BY_ID = {v.id: v.name for v in VOICE_CATALOG}

# Phased-out Vapi voices → a supported, gender-matched replacement. Lets agents
# created before the catalog update still publish instead of erroring.
_LEGACY_VOICE_REMAP = {
    "Hana": "Savannah",
    "Paige": "Emma",
    "Kylie": "Layla",
    "Lily": "Mia",
    "Neha": "Naina",
    "Spencer": "Elliot",
    "Cole": "Kai",
    "Harry": "Rohan",
}


def to_vapi_voice_id(voice_id: str) -> str:
    """Resolve an internal voice id to the exact id Vapi expects.

    Handles case normalization and remaps phased-out legacy voices to a
    supported alternative so publishing never fails on a dead voice.
    """
    if not voice_id:
        return voice_id
    resolved = _VAPI_VOICE_BY_ID.get(voice_id) or voice_id.title()
    return _LEGACY_VOICE_REMAP.get(resolved, resolved)


LANGUAGE_CATALOG = [
    {"code": "en", "name": "English"},
    {"code": "es", "name": "Spanish"},
    {"code": "fr", "name": "French"},
    {"code": "de", "name": "German"},
    {"code": "it", "name": "Italian"},
    {"code": "pt", "name": "Portuguese"},
    {"code": "nl", "name": "Dutch"},
    {"code": "hi", "name": "Hindi"},
    {"code": "ar", "name": "Arabic"},
    {"code": "zh", "name": "Chinese"},
    {"code": "ja", "name": "Japanese"},
]
