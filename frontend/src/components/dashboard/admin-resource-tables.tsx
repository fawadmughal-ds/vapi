"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  Bot,
  FileText,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

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
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
} from "@/lib/utils";
import type {
  AdminAgentRow,
  AdminUserRow,
  AgentTool,
  Call,
  KnowledgeDoc,
  Page,
  PhoneNumber,
  Squad,
} from "@/lib/types";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function Owner({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}) {
  if (!name && !email) return <span className="text-muted-foreground">—</span>;
  return (
    <div>
      <p className="text-sm">{name}</p>
      <p className="text-xs text-muted-foreground">{email}</p>
    </div>
  );
}

function Pagination({
  data,
  page,
  setPage,
}: {
  data: Page<unknown> | null;
  page: number;
  setPage: (fn: (p: number) => number) => void;
}) {
  if (!data || data.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Page {data.page} of {data.pages} · {data.total} total
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
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function useAdminList<T>(base: string, search: string, reloadKey = 0) {
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), page_size: "15" });
    if (debounced) params.set("search", debounced);
    api
      .get<Page<T>>(`${base}?${params.toString()}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [base, page, debounced, reloadKey]);

  return { page, setPage, data, loading };
}

function LoadingRows() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ── Agents ──────────────────────────────────────────────────────────────────
export function AdminAgentsTable() {
  const [search, setSearch] = useState("");
  const { page, setPage, data, loading } = useAdminList<AdminAgentRow>(
    "/admin/agents",
    search
  );

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search agents..." />
      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <LoadingRows />
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={Bot} title="No agents yet" description="Agents created by tenants will appear here." className="border-0" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Voice</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Live</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Owner name={a.owner_name} email={a.owner_email} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{a.voice_id}</TableCell>
                      <TableCell className="text-muted-foreground">{a.model}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.is_provisioned ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(a.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination data={data} page={page} setPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Knowledge base ────────────────────────────────────────────────────────────
export function AdminKnowledgeBaseTable() {
  const [search, setSearch] = useState("");
  const { page, setPage, data, loading } = useAdminList<KnowledgeDoc>(
    "/admin/knowledge-base",
    search
  );

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search documents..." />
      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <LoadingRows />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Knowledge base files uploaded by tenants will appear here."
              className="border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.file_name}</TableCell>
                      <TableCell>
                        <Owner name={d.owner_name} email={d.owner_email} />
                      </TableCell>
                      <TableCell className="uppercase text-muted-foreground">
                        {d.file_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatBytes(d.file_size)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(d.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination data={data} page={page} setPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tools ─────────────────────────────────────────────────────────────────────
export function AdminToolsTable() {
  const [search, setSearch] = useState("");
  const { page, setPage, data, loading } = useAdminList<AgentTool>(
    "/admin/tools",
    search
  );

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search tools..." />
      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <LoadingRows />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No tools yet"
              description="Tools configured on tenants' agents will appear here."
              className="border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tool</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium">{t.name}</p>
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {t.description || t.handler}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Owner name={t.owner_name} email={t.owner_email} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.agent_name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.handler}</TableCell>
                      <TableCell>
                        <StatusBadge status={t.enabled ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(t.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination data={data} page={page} setPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Squads ────────────────────────────────────────────────────────────────────
export function AdminSquadsTable() {
  const [search, setSearch] = useState("");
  const { page, setPage, data, loading } = useAdminList<Squad>(
    "/admin/squads",
    search
  );

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search squads..." />
      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <LoadingRows />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No squads yet"
              description="Squads created by tenants will appear here."
              className="border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Squad</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        {s.description && (
                          <p className="max-w-xs truncate text-xs text-muted-foreground">
                            {s.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Owner name={s.owner_name} email={s.owner_email} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.members.length
                          ? s.members.map((m) => m.agent_name || "?").join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.is_provisioned ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(s.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination data={data} page={page} setPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Calls ───────────────────────────────────────────────────────────────────
export function AdminCallsTable() {
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Call | null>(null);
  const { page, setPage, data, loading } = useAdminList<Call>(
    "/admin/calls",
    search
  );

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search by number..." />
      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <LoadingRows />
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={PhoneCall} title="No calls yet" description="Calls across all tenants will appear here." className="border-0" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setDetail(c)}
                    >
                      <TableCell>
                        <Owner name={c.owner_name} email={c.owner_email} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.agent_name || "—"}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {c.direction}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDuration(c.duration_seconds)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(c.cost)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination data={data} page={page} setPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} className="max-w-2xl">
        {detail && (
          <>
            <DialogHeader>
              <DialogTitle>Call detail</DialogTitle>
              <DialogDescription>
                {detail.owner_email} · {formatDateTime(detail.created_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Meta label="Direction" value={detail.direction} />
                <Meta label="Status" value={detail.status.replace(/_/g, " ")} />
                <Meta label="Duration" value={formatDuration(detail.duration_seconds)} />
                <Meta label="Cost" value={formatCurrency(detail.cost)} />
                <Meta label="Caller" value={detail.caller_number || "—"} />
                <Meta label="Callee" value={detail.callee_number || "—"} />
                <Meta label="Agent" value={detail.agent_name || "—"} />
                <Meta label="Ended" value={detail.ended_reason || "—"} />
              </div>
              {detail.recording_url && (
                <audio controls className="w-full" src={detail.recording_url} />
              )}
              {detail.summary && (
                <Section title="Summary">
                  <p className="text-sm text-muted-foreground">{detail.summary}</p>
                </Section>
              )}
              {detail.transcript && (
                <Section title="Transcript">
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    {detail.transcript}
                  </pre>
                </Section>
              )}
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
}

// ── Phone numbers ─────────────────────────────────────────────────────────────
type PhoneMethod =
  | "vapi_number"
  | "vapi_sip"
  | "twilio"
  | "vonage"
  | "telnyx"
  | "byo_sip";

const PHONE_METHODS: { id: PhoneMethod; label: string }[] = [
  { id: "vapi_number", label: "Platform number (area code)" },
  { id: "vapi_sip", label: "Platform SIP" },
  { id: "twilio", label: "Import Twilio" },
  { id: "vonage", label: "Import Vonage" },
  { id: "telnyx", label: "Import Telnyx" },
  { id: "byo_sip", label: "BYO SIP Trunk" },
];

const EMPTY_PHONE_FORM = {
  user_id: "",
  label: "",
  area_code: "",
  sip_uri: "",
  e164_number: "",
  twilio_account_sid: "",
  twilio_auth_token: "",
  credential_id: "",
};

export function AdminPhoneNumbersTable() {
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const { page, setPage, data, loading } = useAdminList<PhoneNumber>(
    "/admin/phone-numbers",
    search,
    reloadKey
  );
  const [customers, setCustomers] = useState<AdminUserRow[]>([]);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<PhoneNumber | null>(null);
  const [method, setMethod] = useState<PhoneMethod>("vapi_number");
  const [form, setForm] = useState(EMPTY_PHONE_FORM);
  const [reassignUserId, setReassignUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Page<AdminUserRow>>("/admin/customers?page=1&page_size=100")
      .then((res) => setCustomers(res.items))
      .catch(() => {});
  }, []);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  function openProvision() {
    setForm(EMPTY_PHONE_FORM);
    setMethod("vapi_number");
    setProvisionOpen(true);
  }

  function setField(key: keyof typeof EMPTY_PHONE_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const canProvision = (() => {
    if (!form.user_id) return false;
    if (method === "vapi_number") return !!form.area_code;
    if (method === "vapi_sip") return !!form.sip_uri;
    if (method === "twilio") return !!form.e164_number;
    if (method === "vonage" || method === "telnyx")
      return !!form.e164_number && !!form.credential_id;
    if (method === "byo_sip") return !!form.credential_id;
    return false;
  })();

  async function provision() {
    setSaving(true);
    try {
      const body: Record<string, string> = {
        user_id: form.user_id,
        method,
      };
      for (const [k, v] of Object.entries(form)) {
        if (k !== "user_id" && v) body[k] = v;
      }
      const created = await api.post<PhoneNumber>("/admin/phone-numbers", body);
      toast.success(`Number ${created.e164_number} assigned`);
      setProvisionOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Provisioning failed");
    } finally {
      setSaving(false);
    }
  }

  async function reassign() {
    if (!reassignTarget || !reassignUserId) return;
    setSaving(true);
    try {
      await api.patch(`/admin/phone-numbers/${reassignTarget.id}`, {
        user_id: reassignUserId,
      });
      toast.success("Number reassigned");
      setReassignTarget(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reassign failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search numbers..." />
        <Button onClick={openProvision}>
          <Plus className="size-4" /> Provision & assign
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <LoadingRows />
          ) : !data || data.items.length === 0 ? (
            <EmptyState icon={Phone} title="No numbers yet" description="Provision a number and assign it to a tenant." className="border-0" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{p.e164_number}</p>
                        {p.label && (
                          <p className="text-xs text-muted-foreground">{p.label}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Owner name={p.owner_name} email={p.owner_email} />
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {p.provider}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.is_provisioned ? "active" : "inactive"} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(p.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReassignTarget(p);
                            setReassignUserId(p.user_id);
                          }}
                        >
                          Reassign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination data={data} page={page} setPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={provisionOpen} onClose={() => setProvisionOpen(false)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Provision & assign number</DialogTitle>
          <DialogDescription>
            Buy or import a number through the platform voice provider and assign it to a tenant.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
          <div className="space-y-1">
            {PHONE_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  method === m.id
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <PhoneField label="Tenant">
              <Select
                value={form.user_id}
                onChange={(e) => setField("user_id", e.target.value)}
                className="w-full"
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </Select>
            </PhoneField>
            {method === "vapi_number" && (
              <PhoneField label="Area code">
                <Input
                  placeholder="e.g. 346"
                  value={form.area_code}
                  onChange={(e) => setField("area_code", e.target.value)}
                />
              </PhoneField>
            )}
            {method === "vapi_sip" && (
              <PhoneField label="SIP URI">
                <Input
                  value={form.sip_uri}
                  onChange={(e) => setField("sip_uri", e.target.value)}
                />
              </PhoneField>
            )}
            {(method === "twilio" || method === "vonage" || method === "telnyx") && (
              <>
                <PhoneField label="Phone number (E.164)">
                  <Input
                    value={form.e164_number}
                    onChange={(e) => setField("e164_number", e.target.value)}
                  />
                </PhoneField>
                {method === "twilio" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PhoneField label="Twilio Account SID">
                      <Input
                        value={form.twilio_account_sid}
                        onChange={(e) => setField("twilio_account_sid", e.target.value)}
                      />
                    </PhoneField>
                    <PhoneField label="Twilio Auth Token">
                      <Input
                        type="password"
                        value={form.twilio_auth_token}
                        onChange={(e) => setField("twilio_auth_token", e.target.value)}
                      />
                    </PhoneField>
                  </div>
                )}
                {(method === "vonage" || method === "telnyx") && (
                  <PhoneField label="Credential ID">
                    <Input
                      value={form.credential_id}
                      onChange={(e) => setField("credential_id", e.target.value)}
                    />
                  </PhoneField>
                )}
              </>
            )}
            {method === "byo_sip" && (
              <>
                <PhoneField label="Phone number (optional)">
                  <Input
                    value={form.e164_number}
                    onChange={(e) => setField("e164_number", e.target.value)}
                  />
                </PhoneField>
                <PhoneField label="SIP Trunk Credential ID">
                  <Input
                    value={form.credential_id}
                    onChange={(e) => setField("credential_id", e.target.value)}
                  />
                </PhoneField>
              </>
            )}
            <PhoneField label="Label (optional)">
              <Input
                value={form.label}
                onChange={(e) => setField("label", e.target.value)}
              />
            </PhoneField>
            <Button className="w-full" onClick={provision} disabled={saving || !canProvision}>
              {saving && <Spinner />}
              Provision number
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={!!reassignTarget} onClose={() => setReassignTarget(null)}>
        {reassignTarget && (
          <>
            <DialogHeader>
              <DialogTitle>Reassign {reassignTarget.e164_number}</DialogTitle>
              <DialogDescription>
                Move this number to a different tenant. Agent assignment will be cleared.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <PhoneField label="New owner">
                <Select
                  value={reassignUserId}
                  onChange={(e) => setReassignUserId(e.target.value)}
                  className="w-full"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </Select>
              </PhoneField>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReassignTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={reassign} disabled={saving || !reassignUserId}>
                  {saving && <Spinner />}
                  Reassign
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function PhoneField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
