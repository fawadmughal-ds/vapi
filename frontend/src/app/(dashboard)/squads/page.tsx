"use client";

import { useEffect, useState } from "react";
import { Rocket, Trash2, Users, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { Agent, Squad } from "@/lib/types";

export default function SquadsPage() {
  const { data: squads, loading, reload } = useApi<Squad[]>("/squads");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Squad | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Agent[]>("/agents").then(setAgents).catch(() => {});
  }, []);

  function openNew() {
    setEditing(null);
    setName("");
    setDescription("");
    setMemberIds([]);
    setDialogOpen(true);
  }

  function openEdit(s: Squad) {
    setEditing(s);
    setName(s.name);
    setDescription(s.description || "");
    setMemberIds(s.member_agent_ids);
    setDialogOpen(true);
  }

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        member_agent_ids: memberIds,
      };
      if (editing) {
        await api.patch(`/squads/${editing.id}`, payload);
        toast.success("Squad updated");
      } else {
        await api.post("/squads", payload);
        toast.success("Squad created");
      }
      setDialogOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function publish(s: Squad) {
    setBusyId(s.id);
    try {
      await api.post(`/squads/${s.id}/publish`, {});
      toast.success("Squad published");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(s: Squad) {
    if (!confirm(`Delete squad "${s.name}"?`)) return;
    setBusyId(s.id);
    try {
      await api.delete(`/squads/${s.id}`);
      toast.success("Squad deleted");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Squads"
        description="Group agents so calls can be handed off between specialists."
        action={
          <Button onClick={openNew}>
            <Plus className="size-4" /> New Squad
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !squads || squads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No squads yet"
          description="Create a squad and add published agents that can transfer calls to each other."
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" /> Create Squad
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {squads.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Users className="size-5" />
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      s.is_provisioned
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {s.is_provisioned ? "Published" : "Draft"}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {s.description || "No description"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {s.members.length} member{s.members.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {s.members.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No agents added
                      </span>
                    ) : (
                      s.members.map((m, i) => (
                        <span
                          key={m.agent_id}
                          className="rounded-md bg-secondary px-2 py-0.5 text-xs"
                        >
                          {i === 0 ? "★ " : ""}
                          {m.agent_name || "Unknown"}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => publish(s)}
                    disabled={busyId === s.id}
                  >
                    <Rocket className="size-4" />
                    {s.is_provisioned ? "Republish" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(s)}
                    disabled={busyId === s.id}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(s)}
                    disabled={busyId === s.id}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit squad" : "New squad"}</DialogTitle>
          <DialogDescription>
            The first selected agent answers first and can transfer to the others.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sales & Support squad"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this squad handles"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Members</Label>
            {agents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                No agents available. Create and publish agents first.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {agents.map((a) => {
                  const checked = memberIds.includes(a.id);
                  const order = memberIds.indexOf(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleMember(a.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        checked ? "bg-primary/15 text-foreground" : "hover:bg-accent"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded border",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          )}
                        >
                          {checked && order === 0 ? "★" : checked ? "✓" : ""}
                        </span>
                        {a.name}
                      </span>
                      {!a.is_provisioned && (
                        <span className="text-xs text-amber-400">Not published</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Only published agents are included when the squad goes live.
            </p>
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? <Spinner /> : null}
            {editing ? "Save changes" : "Create squad"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
