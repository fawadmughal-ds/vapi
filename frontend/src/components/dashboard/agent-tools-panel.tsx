"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type {
  AgentTool,
  ToolCatalogCategory,
  ToolCatalogEntry,
} from "@/lib/types";

export function AgentToolsPanel({ agentId }: { agentId: string }) {
  const { data: tools, reload } = useApi<AgentTool[]>(
    `/agents/${agentId}/tools`,
    [agentId]
  );
  const [catalog, setCatalog] = useState<ToolCatalogCategory[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<ToolCatalogEntry | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<ToolCatalogCategory[]>("/agents/tool-catalog")
      .then(setCatalog)
      .catch(() => {});
  }, []);

  function choose(tool: ToolCatalogEntry) {
    setSelected(tool);
    const initial: Record<string, string> = {};
    for (const f of tool.fields) initial[f.key] = "";
    setForm(initial);
  }

  async function add() {
    if (!selected) return;
    // Validate required fields.
    for (const f of selected.fields) {
      if (f.required && !form[f.key]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      const config: Record<string, string> = {};
      for (const f of selected.fields) {
        if (form[f.key]?.trim()) config[f.key] = form[f.key].trim();
      }
      await api.post(`/agents/${agentId}/tools`, {
        name: selected.name,
        description: selected.description,
        handler: selected.id,
        parameters_schema: config,
      });
      toast.success(`${selected.name} added`);
      setSelected(null);
      setPickerOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add tool");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(tool: AgentTool) {
    try {
      await api.patch(`/agents/${agentId}/tools/${tool.id}`, {
        enabled: !tool.enabled,
      });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function remove(tool: AgentTool) {
    try {
      await api.delete(`/agents/${agentId}/tools/${tool.id}`);
      toast.success("Tool removed");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-4" /> Tools
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
          <Plus className="size-4" /> Add tool
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Tools let your agent take actions during a call — transfer, hang up,
          send texts, call APIs, and more.
        </p>
        {tools && tools.length > 0 ? (
          tools.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.description || t.handler}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    t.enabled
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {t.enabled ? "On" : "Off"}
                </button>
                <Button variant="ghost" size="icon" onClick={() => remove(t)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No tools configured.
          </p>
        )}
      </CardContent>

      <Dialog
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setSelected(null);
        }}
        className="max-w-2xl"
      >
        {!selected ? (
          <>
            <DialogHeader>
              <DialogTitle>Add a tool</DialogTitle>
              <DialogDescription>
                Choose a tool to give your agent a new capability.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-5 overflow-y-auto">
              {catalog.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {cat.category}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {cat.tools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => choose(tool)}
                        className="flex flex-col items-start gap-1 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/60 hover:bg-accent/40"
                      >
                        <span className="text-sm font-medium">{tool.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tool.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
              <DialogDescription>{selected.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selected.fields.length === 0 && (
                <p className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  This tool has no configuration. Just add it.
                </p>
              )}
              {selected.fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      placeholder={f.placeholder}
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [f.key]: e.target.value }))
                      }
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [f.key]: e.target.value }))
                      }
                    >
                      <option value="">Select…</option>
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : "text"}
                      placeholder={f.placeholder}
                      value={form[f.key] || ""}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [f.key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Back
                </Button>
                <Button onClick={add} disabled={saving}>
                  {saving ? <Spinner /> : <Plus className="size-4" />} Add tool
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </Card>
  );
}
