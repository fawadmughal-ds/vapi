"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn, formatDate } from "@/lib/utils";
import type {
  Agent,
  AgentTool,
  ToolCatalogCategory,
  ToolCatalogEntry,
} from "@/lib/types";

export default function ToolsPage() {
  const { data: tools, loading, reload } = useApi<AgentTool[]>("/tools");
  const [catalog, setCatalog] = useState<ToolCatalogCategory[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [selected, setSelected] = useState<ToolCatalogEntry | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<ToolCatalogCategory[]>("/tools/catalog")
      .then(setCatalog)
      .catch(() => {});
    api.get<Agent[]>("/agents").then(setAgents).catch(() => {});
  }, []);

  function openDialog() {
    setAgentId("");
    setSelected(null);
    setForm({});
    setOpen(true);
  }

  function choose(tool: ToolCatalogEntry) {
    setSelected(tool);
    const initial: Record<string, string> = {};
    for (const f of tool.fields) initial[f.key] = "";
    setForm(initial);
  }

  async function add() {
    if (!agentId) {
      toast.error("Choose an agent first");
      return;
    }
    if (!selected) return;
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
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add tool");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools"
        description="Give your agents new capabilities — transfer, hang up, send text, call APIs, and more."
        action={
          <Button onClick={openDialog} disabled={agents.length === 0}>
            <Plus className="size-4" /> Add tool
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Configured tools</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !tools || tools.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No tools yet"
              description={
                agents.length === 0
                  ? "Create an agent first, then add tools here."
                  : "Click 'Add tool' to give an agent a new capability."
              }
              className="border-0"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium">{t.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.description || t.handler}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/agents/${t.agent_id}`}
                        className="text-primary hover:underline"
                      >
                        {t.agent_name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.handler}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          t.enabled
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {t.enabled ? "On" : "Off"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(t.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {catalog.map((cat) => (
            <div key={cat.category} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {cat.category}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {cat.tools.map((tool) => (
                  <div
                    key={tool.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <p className="text-sm font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a tool</DialogTitle>
          <DialogDescription>
            Choose an agent, then a capability to add to it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Agent</Label>
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">Select an agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          {!selected ? (
            <div className="max-h-[45vh] space-y-5 overflow-y-auto">
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
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-sm font-medium">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.description}
                </p>
              </div>
              {selected.fields.length === 0 ? (
                <p className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  This tool has no configuration. Just add it.
                </p>
              ) : (
                selected.fields.map((f) => (
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
                ))
              )}
              <div className="flex justify-between pt-1">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Back
                </Button>
                <Button onClick={add} disabled={saving}>
                  {saving ? <Spinner /> : <Plus className="size-4" />} Add tool
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
