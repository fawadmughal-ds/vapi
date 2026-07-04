"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  Phone,
  Radio,
  Rocket,
  Save,
  ScrollText,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FullPageSpinner, Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/use-api";
import { useSubscription } from "@/lib/subscription";
import {
  previewVoice as playVoicePreview,
  stopVoicePreview,
} from "@/lib/voice-preview";
import type {
  Agent,
  FirstMessageMode,
  LanguageOption,
  ModelOption,
  PhoneNumber,
  TranscriberOption,
  VoiceOption,
} from "@/lib/types";
import { AgentToolsPanel } from "@/components/dashboard/agent-tools-panel";
import { AgentTalkDialog } from "@/components/dashboard/agent-talk-dialog";
import { AgentLogs, AgentAnalysis } from "@/components/dashboard/agent-insights";

type Tab = "assistant" | "logs" | "analysis" | "advanced";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { outOfCredits } = useSubscription();
  const { data: agent, loading, error, setData } = useApi<Agent>(`/agents/${id}`, [id]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [transcribers, setTranscribers] = useState<TranscriberOption[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [firstModes, setFirstModes] = useState<FirstMessageMode[]>([]);
  const [tab, setTab] = useState<Tab>("assistant");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [toNumber, setToNumber] = useState("");
  const [fromNumberId, setFromNumberId] = useState("");
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    api.get<VoiceOption[]>("/agents/voices").then(setVoices).catch(() => {});
    api.get<ModelOption[]>("/agents/models").then(setModels).catch(() => {});
    api
      .get<TranscriberOption[]>("/agents/transcribers")
      .then(setTranscribers)
      .catch(() => {});
    api.get<LanguageOption[]>("/agents/languages").then(setLanguages).catch(() => {});
    api
      .get<FirstMessageMode[]>("/agents/first-message-modes")
      .then(setFirstModes)
      .catch(() => {});
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => stopVoicePreview();
  }, []);

  const activeNumbers = numbers.filter((n) => n.is_provisioned);
  useEffect(() => {
    if (!callOpen) return;
    api
      .get<PhoneNumber[]>("/phone-numbers")
      .then((list) => {
        setNumbers(list);
        const firstActive = list.find((n) => n.is_provisioned);
        if (firstActive && !fromNumberId) setFromNumberId(firstActive.id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callOpen]);

  if (loading) return <FullPageSpinner />;
  if (error || !agent) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {error || "Agent not found."}
      </div>
    );
  }

  function update<K extends keyof Agent>(key: K, value: Agent[K]) {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setConfig(key: string, value: unknown) {
    setData((prev) =>
      prev ? { ...prev, configuration: { ...prev.configuration, [key]: value } } : prev
    );
  }

  const cfg = agent.configuration as Record<string, unknown>;
  const temperature = typeof cfg.temperature === "number" ? cfg.temperature : 0.7;
  const transcriberId =
    (cfg.transcriber as string) ||
    (transcribers.length ? transcribers[0].id : "deepgram/nova-2");
  const firstMode = (cfg.first_message_mode as string) || "assistant-speaks-first";

  function onModelChange(modelId: string) {
    const m = models.find((x) => x.id === modelId);
    update("model", modelId);
    if (m) setConfig("model_provider", m.provider);
  }

  function onTranscriberChange(tid: string) {
    const t = transcribers.find((x) => x.id === tid);
    setConfig("transcriber", tid);
    if (t) {
      setConfig("transcriber_provider", t.provider);
      setConfig("transcriber_model", t.model);
    }
  }

  function previewSelectedVoice() {
    if (!agent) return;
    if (previewing) {
      stopVoicePreview();
      setPreviewing(false);
      return;
    }
    const voice =
      voices.find((v) => v.id === agent.voice_id) ||
      ({
        id: agent.voice_id,
        name: agent.voice_id || "Voice",
        provider: agent.voice_provider,
        language: agent.language || "en",
        gender: null,
      } as VoiceOption);
    const started = playVoicePreview(voice, () => setPreviewing(false));
    if (started) setPreviewing(true);
    else toast.error("Voice preview isn't supported in this browser.");
  }

  function payloadFromAgent(a: Agent) {
    return {
      name: a.name,
      description: a.description,
      first_message: a.first_message,
      system_prompt: a.system_prompt,
      voice_id: a.voice_id,
      voice_provider: a.voice_provider,
      language: a.language,
      model: a.model,
      configuration: a.configuration,
    };
  }

  async function save() {
    if (!agent) return;
    setSaving(true);
    try {
      const updated = await api.patch<Agent>(`/agents/${id}`, payloadFromAgent(agent));
      setData(updated);
      toast.success("Agent saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!agent) return;
    setPublishing(true);
    try {
      await api.patch<Agent>(`/agents/${id}`, payloadFromAgent(agent));
      const updated = await api.post<Agent>(`/agents/${id}/publish`);
      setData(updated);
      toast.success("Agent published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    try {
      await api.delete(`/agents/${id}`);
      toast.success("Agent deleted");
      router.push("/agents");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function openTalk() {
    if (outOfCredits) {
      toast.error("You're out of credits. Contact your administrator to buy more.");
      return;
    }
    if (!agent?.is_provisioned) {
      toast.error("Publish the agent first to talk to it.");
      return;
    }
    setTalkOpen(true);
  }

  async function startCall() {
    if (outOfCredits) {
      toast.error("You're out of credits. Contact your administrator to buy more.");
      return;
    }
    try {
      await api.post("/calls/outbound", {
        agent_id: id,
        to_number: toNumber,
        from_phone_number_id: fromNumberId || undefined,
      });
      toast.success("Outbound call started");
      setCallOpen(false);
      setToNumber("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Call failed");
    }
  }

  const TABS: { id: Tab; label: string; icon: typeof Settings2 }[] = [
    { id: "assistant", label: "Assistant", icon: Settings2 },
    { id: "logs", label: "Logs", icon: ScrollText },
    { id: "analysis", label: "Analysis", icon: BarChart3 },
    { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={agent.name}
        description={agent.description || "Configure your agent."}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={agent.status} />
            <Button
              variant="outline"
              onClick={() => setCallOpen(true)}
              disabled={outOfCredits}
              title={outOfCredits ? "Out of credits — contact your administrator" : undefined}
            >
              <Phone className="size-4" /> Test call
            </Button>
            <Button
              variant="secondary"
              onClick={openTalk}
              disabled={outOfCredits}
              title={outOfCredits ? "Out of credits — contact your administrator" : undefined}
            >
              <Radio className="size-4" /> Talk
            </Button>
            <Button onClick={publish} disabled={publishing}>
              {publishing ? <Spinner /> : <Rocket className="size-4" />}{" "}
              {agent.is_provisioned ? "Republish" : "Publish"}
            </Button>
          </div>
        }
      />

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "assistant" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={agent.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
                  <div className="space-y-2">
                    <Label>First message</Label>
                    <Input
                      value={agent.first_message || ""}
                      onChange={(e) => update("first_message", e.target.value)}
                      placeholder="Hi, thanks for calling!"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>First message mode</Label>
                    <Select
                      value={firstMode}
                      onChange={(e) => setConfig("first_message_mode", e.target.value)}
                    >
                      {firstModes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>System prompt</Label>
                  <Textarea
                    rows={8}
                    value={agent.system_prompt}
                    onChange={(e) => update("system_prompt", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select
                      value={agent.model}
                      onChange={(e) => onModelChange(e.target.value)}
                    >
                      {!models.some((m) => m.id === agent.model) && (
                        <option value={agent.model}>{agent.model}</option>
                      )}
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {m.provider}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {models.find((m) => m.id === agent.model)?.description ||
                        "Non-OpenAI models require the matching integration to be connected."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Temperature{" "}
                      <span className="text-muted-foreground">
                        ({temperature.toFixed(1)})
                      </span>
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={temperature}
                      onChange={(e) => setConfig("temperature", Number(e.target.value))}
                      className="mt-3 w-full accent-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower is more focused, higher is more creative.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Voice &amp; Transcriber</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Voice</Label>
                    <div className="flex gap-2">
                      <Select
                        value={agent.voice_id}
                        onChange={(e) => {
                          update("voice_id", e.target.value);
                          stopVoicePreview();
                          setPreviewing(false);
                        }}
                      >
                        <option value="">Select a voice</option>
                        {voices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                            {v.gender ? ` · ${v.gender}` : ""}
                          </option>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Preview voice"
                        disabled={!agent.voice_id}
                        onClick={previewSelectedVoice}
                      >
                        {previewing ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Volume2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Transcriber</Label>
                    <Select
                      value={transcriberId}
                      onChange={(e) => onTranscriberChange(e.target.value)}
                    >
                      {transcribers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.provider}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={agent.language}
                      onChange={(e) => update("language", e.target.value)}
                    >
                      {languages.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="destructive" onClick={remove}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Spinner /> : <Save className="size-4" />} Save changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <AgentToolsPanel agentId={id} />
        </div>
      )}

      {tab === "logs" && <AgentLogs agentId={id} />}
      {tab === "analysis" && <AgentAnalysis agentId={id} />}
      {tab === "advanced" && (
        <AdvancedPanel
          cfg={cfg}
          setConfig={setConfig}
          onSave={save}
          saving={saving}
        />
      )}

      <AgentTalkDialog
        agentId={id}
        open={talkOpen}
        onClose={() => setTalkOpen(false)}
      />

      <Dialog open={callOpen} onClose={() => setCallOpen(false)}>
        <DialogHeader>
          <DialogTitle>Place a test call</DialogTitle>
          <DialogDescription>
            The agent will call the number below from one of your active numbers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Call from</Label>
            {activeNumbers.length === 0 ? (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
                You have no active phone numbers. Add or buy one on the{" "}
                <a href="/phone-numbers" className="underline">
                  Phone Numbers
                </a>{" "}
                page to place calls.
              </p>
            ) : (
              <Select
                value={fromNumberId}
                onChange={(e) => setFromNumberId(e.target.value)}
              >
                {activeNumbers.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.e164_number}
                    {n.label ? ` — ${n.label}` : ""}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Call to (E.164)</Label>
            <Input
              placeholder="+14155552671"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={startCall}
            disabled={
              outOfCredits ||
              !toNumber ||
              activeNumbers.length === 0 ||
              !fromNumberId
            }
          >
            <Phone className="size-4" /> Start call
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function AdvancedPanel({
  cfg,
  setConfig,
  onSave,
  saving,
}: {
  cfg: Record<string, unknown>;
  setConfig: (key: string, value: unknown) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const num = (k: string) => (typeof cfg[k] === "number" ? String(cfg[k]) : "");
  const str = (k: string) => (typeof cfg[k] === "string" ? (cfg[k] as string) : "");

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Advanced</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Silence timeout (seconds)</Label>
            <Input
              type="number"
              placeholder="30"
              value={num("silence_timeout_seconds")}
              onChange={(e) =>
                setConfig(
                  "silence_timeout_seconds",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              End the call after this much silence.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Max call duration (seconds)</Label>
            <Input
              type="number"
              placeholder="600"
              value={num("max_duration_seconds")}
              onChange={(e) =>
                setConfig(
                  "max_duration_seconds",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Hard limit on how long a call can run.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>End call message</Label>
          <Input
            placeholder="Thanks for calling. Goodbye!"
            value={str("end_call_message")}
            onChange={(e) => setConfig("end_call_message", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>End call phrases (comma separated)</Label>
          <Input
            placeholder="goodbye, bye, that's all"
            value={str("end_call_phrases")}
            onChange={(e) => setConfig("end_call_phrases", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            The agent hangs up when the caller says one of these.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Background sound</Label>
          <Select
            value={str("background_sound") || "off"}
            onChange={(e) => setConfig("background_sound", e.target.value)}
          >
            <option value="off">Off</option>
            <option value="office">Office ambience</option>
          </Select>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Spinner /> : <Save className="size-4" />} Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
