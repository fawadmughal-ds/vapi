"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useWebCall } from "@/lib/use-web-call";

export function AgentTalkDialog({
  agentId,
  open,
  onClose,
}: {
  agentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const {
    status,
    transcript,
    muted,
    assistantSpeaking,
    error,
    start,
    stop,
    toggleMute,
    reset,
  } = useWebCall(agentId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  function handleClose() {
    stop();
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Talk to your agent</DialogTitle>
        <DialogDescription>
          A live voice session in your browser — no phone number needed. Allow
          microphone access when prompted.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className={cn(
              "flex size-20 items-center justify-center rounded-full border-2 transition-colors",
              status === "active"
                ? assistantSpeaking
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-success bg-success/10 text-success"
                : "border-border text-muted-foreground"
            )}
          >
            {status === "connecting" ? (
              <Spinner />
            ) : (
              <Radio
                className={cn("size-8", assistantSpeaking && "animate-pulse")}
              />
            )}
          </div>
          <p className="text-sm font-medium capitalize">
            {status === "active"
              ? assistantSpeaking
                ? "Agent speaking…"
                : "Listening…"
              : status === "connecting"
                ? "Connecting…"
                : status === "ended"
                  ? "Call ended"
                  : status === "error"
                    ? "Error"
                    : "Ready"}
          </p>
          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        {(status === "active" || transcript.length > 0) && (
          <div
            ref={scrollRef}
            className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3"
          >
            {transcript.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                Transcript will appear here…
              </p>
            ) : (
              transcript.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    line.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <span
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-1.5 text-sm",
                      line.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {line.text}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          {status === "idle" || status === "ended" || status === "error" ? (
            <Button onClick={start} className="w-full">
              <Mic className="size-4" />
              {status === "ended" || status === "error" ? "Call again" : "Start call"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={toggleMute}
                disabled={status !== "active"}
              >
                {muted ? (
                  <MicOff className="size-4" />
                ) : (
                  <Mic className="size-4" />
                )}
                {muted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  stop();
                }}
              >
                <PhoneOff className="size-4" /> End
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
