"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Info, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
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
import { useApi } from "@/lib/use-api";
import type { Agent, PhoneNumber } from "@/lib/types";

type Method =
  | "vapi_number"
  | "vapi_sip"
  | "twilio"
  | "vonage"
  | "telnyx"
  | "byo_sip";

const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: "vapi_number", label: "Free Vapi Number", hint: "Instant US number by area code" },
  { id: "vapi_sip", label: "Free Vapi SIP", hint: "A free SIP endpoint" },
  { id: "twilio", label: "Import Twilio", hint: "A number you own in Twilio" },
  { id: "vonage", label: "Import Vonage", hint: "A number you own in Vonage" },
  { id: "telnyx", label: "Import Telnyx", hint: "A number you own in Telnyx" },
  { id: "byo_sip", label: "BYO SIP Trunk", hint: "Your own SIP trunk number" },
];

const EMPTY_FORM = {
  label: "",
  area_code: "",
  sip_uri: "",
  e164_number: "",
  twilio_account_sid: "",
  twilio_auth_token: "",
  credential_id: "",
};

export default function PhoneNumbersPage() {
  const { data: numbers, loading, reload } = useApi<PhoneNumber[]>(
    "/phone-numbers"
  );
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("vapi_number");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Agent[]>("/agents").then(setAgents).catch(() => {});
  }, []);

  function openDialog() {
    setForm(EMPTY_FORM);
    setMethod("vapi_number");
    setOpen(true);
  }

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function add() {
    setSaving(true);
    try {
      const body: Record<string, string | undefined> = { method };
      for (const [k, v] of Object.entries(form)) {
        if (v) body[k] = v;
      }
      const created = await api.post<PhoneNumber>("/phone-numbers", body);
      toast.success(`Number ${created.e164_number} added`);
      setOpen(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add number");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = (() => {
    if (method === "vapi_number") return !!form.area_code;
    if (method === "vapi_sip") return !!form.sip_uri;
    if (method === "twilio") return !!form.e164_number;
    if (method === "vonage" || method === "telnyx")
      return !!form.e164_number && !!form.credential_id;
    if (method === "byo_sip") return !!form.credential_id;
    return false;
  })();

  async function assign(id: string, agentId: string) {
    try {
      await api.post(`/phone-numbers/${id}/assign`, {
        agent_id: agentId || null,
      });
      toast.success("Assignment updated");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this phone number?")) return;
    try {
      await api.delete(`/phone-numbers/${id}`);
      toast.success("Number removed");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phone Numbers"
        description="Provision and assign numbers from Twilio, Vapi, or your SIP trunk — isolated to this workspace."
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Telephony", href: "/phone-numbers" },
          { label: "Numbers" },
        ]}
        action={
          <Button onClick={openDialog}>
            <Plus className="size-4" /> Add Number
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !numbers || numbers.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No phone numbers"
              description="Add a number to route calls to your agents."
              className="border-0"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">
                      {n.e164_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {n.label || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={n.status} />
                        {!n.is_provisioned && (
                          <span className="text-xs text-amber-400">
                            Not active for calls
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={n.agent_id || ""}
                        onChange={(e) => assign(n.id, e.target.value)}
                        className="h-8 w-44"
                      >
                        <option value="">Unassigned</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(n.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a phone number</DialogTitle>
          <DialogDescription>
            Pick how you want to add a number. Each option connects the number so
            your agents can make and receive calls.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
          <div className="space-y-1">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Options
            </p>
            {METHODS.map((m) => (
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
            {method === "vapi_number" && (
              <>
                <Field label="Area Code">
                  <Input
                    placeholder="e.g. 346, 984, 326"
                    value={form.area_code}
                    onChange={(e) => setField("area_code", e.target.value)}
                  />
                </Field>
                <Note>
                  <span className="font-medium text-foreground">
                    Free US phone numbers
                  </span>{" "}
                  · up to 10 per account. Only US area codes are supported. For
                  international or production numbers, import a Twilio/Vonage/Telnyx
                  number instead.
                </Note>
              </>
            )}

            {method === "vapi_sip" && (
              <>
                <Field label="SIP URI">
                  <Input
                    placeholder="sip:user@yourdomain.com"
                    value={form.sip_uri}
                    onChange={(e) => setField("sip_uri", e.target.value)}
                  />
                </Field>
                <Note>A free SIP endpoint hosted by the provider.</Note>
              </>
            )}

            {method === "twilio" && (
              <>
                <Field label="Phone number (E.164)">
                  <Input
                    placeholder="+14155552671"
                    value={form.e164_number}
                    onChange={(e) => setField("e164_number", e.target.value)}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Twilio Account SID">
                    <Input
                      placeholder="AC…"
                      value={form.twilio_account_sid}
                      onChange={(e) =>
                        setField("twilio_account_sid", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Twilio Auth Token">
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={form.twilio_auth_token}
                      onChange={(e) =>
                        setField("twilio_auth_token", e.target.value)
                      }
                    />
                  </Field>
                </div>
                <Note>
                  Buy the number in your Twilio console first, then enter it here
                  with your Twilio credentials. Leave credentials blank to use the
                  platform&apos;s configured Twilio account.
                </Note>
              </>
            )}

            {(method === "vonage" || method === "telnyx") && (
              <>
                <Field label="Phone number (E.164)">
                  <Input
                    placeholder="+14155552671"
                    value={form.e164_number}
                    onChange={(e) => setField("e164_number", e.target.value)}
                  />
                </Field>
                <Field label="Credential ID">
                  <Input
                    placeholder="From Admin → Integrations"
                    value={form.credential_id}
                    onChange={(e) => setField("credential_id", e.target.value)}
                  />
                </Field>
                <Note>
                  Connect{" "}
                  <span className="capitalize text-foreground">{method}</span>{" "}
                  under <span className="text-foreground">Admin → Integrations</span>{" "}
                  to get a Credential ID, then import the number you own there.
                </Note>
              </>
            )}

            {method === "byo_sip" && (
              <>
                <Field label="Phone number (optional)">
                  <Input
                    placeholder="+14155552671"
                    value={form.e164_number}
                    onChange={(e) => setField("e164_number", e.target.value)}
                  />
                </Field>
                <Field label="SIP Trunk Credential ID">
                  <Input
                    placeholder="From Admin → Integrations"
                    value={form.credential_id}
                    onChange={(e) => setField("credential_id", e.target.value)}
                  />
                </Field>
                <Note>
                  Bring your own SIP trunk. Add the SIP trunk credential under{" "}
                  <span className="text-foreground">Admin → Integrations</span>{" "}
                  first.
                </Note>
              </>
            )}

            <Field label="Label (optional)">
              <Input
                placeholder="e.g. Main line"
                value={form.label}
                onChange={(e) => setField("label", e.target.value)}
              />
            </Field>

            <Button
              className="w-full"
              onClick={add}
              disabled={saving || !canSubmit}
            >
              {saving ? "Working…" : "Add number"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>{children}</p>
    </div>
  );
}
