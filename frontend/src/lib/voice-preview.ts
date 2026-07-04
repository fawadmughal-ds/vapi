import { api } from "./api";
import type { VoiceOption } from "./types";

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
// Bumps on every stop/start so async fetches from a previous request are ignored.
let playToken = 0;

export function voicePreviewSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("speechSynthesis" in window || typeof Audio !== "undefined")
  );
}

export function stopVoicePreview() {
  playToken++;
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

/**
 * Plays an audible preview for a voice. Order of preference:
 *   1. A real sample provided on the voice (preview_url)
 *   2. The backend TTS preview endpoint (real provider voice)
 *   3. The browser's built-in speech synthesis (works offline / no keys)
 *
 * Returns false only when no preview mechanism is available at all.
 */
export function previewVoice(v: VoiceOption, onEnd?: () => void): boolean {
  stopVoicePreview();
  const token = ++playToken;

  if (v.preview_url) {
    playUrl(v.preview_url, token, onEnd, () => fetchBackendPreview(v, token, onEnd));
    return true;
  }

  // Try the backend first; fall back to local speech if it isn't available.
  fetchBackendPreview(v, token, onEnd);
  return true;
}

function playUrl(
  url: string,
  token: number,
  onEnd?: () => void,
  onFail?: () => void
) {
  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => {
    if (token === playToken) onEnd?.();
  };
  audio.onerror = () => {
    if (token === playToken) onFail?.();
  };
  audio.play().catch(() => {
    if (token === playToken) onFail?.();
  });
}

async function fetchBackendPreview(
  v: VoiceOption,
  token: number,
  onEnd?: () => void
) {
  try {
    const blob = await api.getBlob(`/agents/voices/${v.id}/preview`);
    if (token !== playToken) return; // a newer request superseded this one
    const objectUrl = URL.createObjectURL(blob);
    currentObjectUrl = objectUrl;
    const audio = new Audio(objectUrl);
    currentAudio = audio;
    audio.onended = () => {
      if (token === playToken) onEnd?.();
    };
    audio.onerror = () => {
      if (token === playToken) speakVoice(v, onEnd);
    };
    await audio.play().catch(() => {
      if (token === playToken) speakVoice(v, onEnd);
    });
  } catch {
    // Backend has no TTS provider configured (503) or network failed.
    if (token === playToken) speakVoice(v, onEnd);
  }
}

function speakVoice(v: VoiceOption, onEnd?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return false;
  }

  const utter = new SpeechSynthesisUtterance(
    `Hi, I'm ${v.name}. This is how I'll sound on your calls.`
  );

  const langPrefix = (v.language || "en").toLowerCase();
  const all = window.speechSynthesis.getVoices();
  const matching = all.filter((sv) =>
    sv.lang.toLowerCase().startsWith(langPrefix)
  );

  // Best-effort gender match by common voice-name hints.
  const femaleHints = [
    "female",
    "woman",
    "samantha",
    "victoria",
    "zira",
    "lily",
    "hana",
  ];
  const maleHints = ["male", "man", "david", "daniel", "fred", "alex"];
  const hints = v.gender === "female" ? femaleHints : maleHints;
  const picked =
    matching.find((sv) => hints.some((h) => sv.name.toLowerCase().includes(h))) ||
    matching[0] ||
    all[0];
  if (picked) utter.voice = picked;

  // Differentiate genders even when the OS only offers neutral voices.
  utter.pitch = v.gender === "female" ? 1.15 : 0.85;
  utter.rate = 1;
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utter);
  return true;
}
