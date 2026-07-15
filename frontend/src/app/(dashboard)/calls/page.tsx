"use client";

import { useEffect, useState } from "react";
import { PhoneCall, Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  formatDateTime,
  formatDuration,
} from "@/lib/utils";
import type { Call, Page } from "@/lib/types";

export default function CallsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState("");
  const [data, setData] = useState<Page<Call> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Call | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: "15",
    });
    if (debounced) params.set("search", debounced);
    if (status) params.set("status", status);
    if (direction) params.set("direction", direction);
    api
      .get<Page<Call>>(`/calls?${params.toString()}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, debounced, status, direction]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calls"
        description="Browse, search, and review every call your agents handled."
      />

      <div className="glass-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="group relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search number or transcript..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="sm:w-44"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In progress</option>
          <option value="failed">Failed</option>
          <option value="no_answer">No answer</option>
        </Select>
        <Select
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value);
            setPage(1);
          }}
          className="sm:w-40"
        >
          <option value="">All directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={PhoneCall}
              title="No calls found"
              description="Calls will appear here as your agents handle them."
              className="border-0"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell className="font-medium">
                      {c.caller_number || c.callee_number || "Unknown"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.agent_name || "—"}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {c.direction}
                    </TableCell>
                    <TableCell>{formatDuration(c.duration_seconds)}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(c.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-mono text-foreground">{data.page}</span> of{" "}
            <span className="font-mono text-foreground">{data.pages}</span> ·{" "}
            <span className="font-mono text-foreground">{data.total}</span> calls
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        className="max-w-2xl"
      >
        {selected && (
          <>
            <DialogHeader>
              <DialogTitle>Call Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Detail label="Caller" value={selected.caller_number || "—"} />
                <Detail
                  label="Duration"
                  value={formatDuration(selected.duration_seconds)}
                />
                <Detail label="Status" value={selected.status} />
              </div>
              {selected.recording_url && (
                <div>
                  <p className="mb-1 text-sm font-medium">Recording</p>
                  <audio controls src={selected.recording_url} className="w-full" />
                </div>
              )}
              {selected.summary && (
                <div>
                  <p className="mb-1 text-sm font-medium">Summary</p>
                  <p className="text-sm text-muted-foreground">
                    {selected.summary}
                  </p>
                </div>
              )}
              <div>
                <p className="mb-1 text-sm font-medium">Transcript</p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
                  {selected.transcript || "No transcript available."}
                </div>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-medium capitalize">{value}</p>
    </div>
  );
}
