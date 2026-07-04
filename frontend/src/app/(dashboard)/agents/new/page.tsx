"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Rocket,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  previewVoice as playVoicePreview,
  stopVoicePreview,
} from "@/lib/voice-preview";
import type {
  Agent,
  KnowledgeDoc,
  LanguageOption,
  PhoneNumber,
  VoiceOption,
} from "@/lib/types";

const STEPS = [
  "Name",
  "System Prompt",
  "Voice",
  "Language",
  "Knowledge Base",
  "Phone Number",
  "Publish",
];

export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    first_message: "",
    system_prompt:
      "You are a friendly, professional voice assistant. Greet the caller, understand their needs, and help them efficiently. Keep responses concise and natural.",
    voice_id: "",
    language: "en",
    documentId: "",
    phoneNumberId: "",
  });

  useEffect(() => {
    api.get<VoiceOption[]>("/agents/voices").then(setVoices).catch(() => {});
    api
      .get<LanguageOption[]>("/agents/languages")
      .then(setLanguages)
      .catch(() => {});
    api.get<KnowledgeDoc[]>("/knowledge-base").then(setDocs).catch(() => {});
    api.get<PhoneNumber[]>("/phone-numbers").then(setNumbers).catch(() => {});

    // Warm up the browser voice list (populated asynchronously in some browsers).
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop any preview when navigating away from the Voice step.
  useEffect(() => {
    if (step !== 2) stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function stopPreview() {
    stopVoicePreview();
    setPlayingVoice(null);
  }

  function previewVoice(v: VoiceOption) {
    const started = playVoicePreview(v, () => setPlayingVoice(null));
    if (started) setPlayingVoice(v.id);
    else toast.error("Voice preview isn't supported in this browser.");
  }

  function canProceed(): boolean {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.system_prompt.trim().length > 0;
    if (step === 2) return form.voice_id.length > 0;
    return true;
  }

  async function publish() {
    setSubmitting(true);
    try {
      const agent = await api.post<Agent>("/agents", {
        name: form.name,
        description: form.description,
        first_message: form.first_message,
        system_prompt: form.system_prompt,
        voice_id: form.voice_id,
        language: form.language,
      });

      if (form.phoneNumberId) {
        await api
          .post(`/phone-numbers/${form.phoneNumberId}/assign`, {
            agent_id: agent.id,
          })
          .catch(() => {});
      }

      await api.post(`/agents/${agent.id}/publish`);
      toast.success("Agent published successfully!");
      router.push(`/agents/${agent.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish agent");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create AI Agent"
        description="Configure your voice agent in a few quick steps."
      />

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary/20 text-primary ring-2 ring-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:block",
                i === step ? "font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="hidden h-px w-6 bg-border sm:block" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Agent name</Label>
                <Input
                  placeholder="e.g. Sales Assistant"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="What does this agent do?"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>First message</Label>
                <Input
                  placeholder="Hi! Thanks for calling. How can I help?"
                  value={form.first_message}
                  onChange={(e) => set("first_message", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <Label>System prompt</Label>
              <Textarea
                rows={10}
                value={form.system_prompt}
                onChange={(e) => set("system_prompt", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Define your agent&apos;s personality, knowledge, and behavior.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Click a voice to select it and hear a sample, or tap the speaker
                to preview without selecting.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {voices.map((v) => {
                  const selected = form.voice_id === v.id;
                  const playing = playingVoice === v.id;
                  return (
                    <div
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        set("voice_id", v.id);
                        previewVoice(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          set("voice_id", v.id);
                          previewVoice(v);
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg border p-4 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {v.gender} · {v.language}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Preview ${v.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (playing) stopPreview();
                            else previewVoice(v);
                          }}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full border transition-colors",
                            playing
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {playing ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Volume2 className="size-4" />
                          )}
                        </button>
                        {selected && <Check className="size-4 text-primary" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <Label>Primary language</Label>
              <Select
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              <Label>Attach knowledge base (optional)</Label>
              {docs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No documents uploaded yet. You can add them later from the
                  Knowledge Base page.
                </p>
              ) : (
                <Select
                  value={form.documentId}
                  onChange={(e) => set("documentId", e.target.value)}
                >
                  <option value="">None</option>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.file_name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-2">
              <Label>Assign phone number (optional)</Label>
              {numbers.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No phone numbers yet. Add one from the Phone Numbers page to
                  receive inbound calls.
                </p>
              ) : (
                <Select
                  value={form.phoneNumberId}
                  onChange={(e) => set("phoneNumberId", e.target.value)}
                >
                  <option value="">None</option>
                  {numbers.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.e164_number} {n.label ? `(${n.label})` : ""}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review &amp; publish</h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Review label="Name" value={form.name} />
                <Review
                  label="Voice"
                  value={voices.find((v) => v.id === form.voice_id)?.name || "—"}
                />
                <Review
                  label="Language"
                  value={
                    languages.find((l) => l.code === form.language)?.name || "—"
                  }
                />
                <Review
                  label="Phone"
                  value={
                    numbers.find((n) => n.id === form.phoneNumberId)
                      ?.e164_number || "Not assigned"
                  }
                />
              </dl>
              <p className="text-xs text-muted-foreground">
                Publishing provisions your agent and makes it ready to take calls.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
          disabled={submitting}
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={publish} disabled={submitting}>
            {submitting ? <Spinner /> : <Rocket className="size-4" />} Publish
            Agent
          </Button>
        )}
      </div>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
