"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import type { WebCallConfig } from "@/lib/types";

export type WebCallStatus = "idle" | "connecting" | "active" | "ended" | "error";

export interface TranscriptLine {
  role: "assistant" | "user";
  text: string;
}

// The Vapi web SDK is browser-only; import lazily so SSR never touches it.
type VapiInstance = {
  start: (assistantId: string) => Promise<unknown>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  on: (event: string, cb: (data?: unknown) => void) => void;
  removeAllListeners?: () => void;
};

/**
 * Vapi/Daily emit errors in several shapes (strings, `{ message }`,
 * `{ type, msg, details }`, nested `{ error: {...} }`). Always resolve to a
 * human-readable string so we never try to render an object as a React child.
 */
function extractErrorMessage(e: unknown): string {
  if (!e) return "Call could not connect. Please try again.";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;

  const obj = e as Record<string, unknown>;
  const candidates = [
    obj.message,
    obj.errorMsg,
    obj.msg,
    (obj.error as { message?: string } | undefined)?.message,
    (obj.error as { msg?: string } | undefined)?.msg,
  ];
  const raw = candidates.find((c) => typeof c === "string") as string | undefined;

  // Vapi ejects the meeting when the assistant fails to start (bad/missing
  // provider credential, invalid assistant config, or account limits).
  if (raw && /ejection|meeting has ended|ejected/i.test(raw)) {
    return "The agent couldn't start the call. This usually means a voice/model provider isn't connected for this agent, or the assistant needs to be re-published. Check Integrations and try again.";
  }
  if (raw) return raw;

  try {
    return JSON.stringify(e);
  } catch {
    return "Call could not connect. Please try again.";
  }
}

export function useWebCall(agentId: string) {
  const [status, setStatus] = useState<WebCallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [muted, setMutedState] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<VapiInstance | null>(null);

  const stop = useCallback(() => {
    try {
      vapiRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
      vapiRef.current?.removeAllListeners?.();
      vapiRef.current = null;
    };
  }, [stop]);

  const start = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setStatus("connecting");
    try {
      const cfg = await api.get<WebCallConfig>(`/agents/${agentId}/web-call`);
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(cfg.public_key) as unknown as VapiInstance;
      vapiRef.current = vapi;

      vapi.on("call-start", () => setStatus("active"));
      vapi.on("call-end", () => {
        setStatus("ended");
        setAssistantSpeaking(false);
      });
      vapi.on("speech-start", () => setAssistantSpeaking(true));
      vapi.on("speech-end", () => setAssistantSpeaking(false));
      vapi.on("error", (e?: unknown) => {
        setError(extractErrorMessage(e));
        setStatus("error");
      });
      vapi.on("message", (msg?: unknown) => {
        const m = msg as {
          type?: string;
          role?: string;
          transcriptType?: string;
          transcript?: string;
        };
        if (m?.type === "transcript" && m.transcriptType === "final" && m.transcript) {
          const role = m.role === "assistant" ? "assistant" : "user";
          setTranscript((prev) => [...prev, { role, text: m.transcript as string }]);
        }
      });

      await vapi.start(cfg.assistant_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start call");
      setStatus("error");
    }
  }, [agentId]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMutedState(next);
    try {
      vapiRef.current?.setMuted(next);
    } catch {
      /* ignore */
    }
  }, [muted]);

  const reset = useCallback(() => {
    stop();
    setStatus("idle");
    setTranscript([]);
    setMutedState(false);
    setError(null);
  }, [stop]);

  return {
    status,
    transcript,
    muted,
    assistantSpeaking,
    error,
    start,
    stop,
    toggleMute,
    reset,
  };
}
