"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Trash2, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import type { Campaign, CampaignContact, CampaignLaunchResult } from "@/lib/types";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirm = useConfirm();
  const campaignId = String(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [manual, setManual] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, list] = await Promise.all([
        api.get<Campaign>(`/campaigns/${campaignId}`),
        api.get<CampaignContact[]>(`/campaigns/${campaignId}/contacts`),
      ]);
      setCampaign(c);
      setContacts(list);
    } catch {
      router.replace("/campaigns");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const updated = await api.upload<Campaign>(
        `/campaigns/${campaignId}/contacts/upload`,
        form
      );
      setCampaign(updated);
      toast.success("Contacts uploaded.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function parseManual(): { name?: string; phone: string }[] {
    return manual
      .split(/[\n,;]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Support "Name <phone>" or "phone" or "phone Name"
        const match = line.match(/([+\d][\d\s()-]{5,})/);
        const phone = match ? match[1].trim() : line;
        const name = match ? line.replace(match[1], "").trim() : "";
        return { name: name || undefined, phone };
      });
  }

  async function addManual() {
    const parsed = parseManual();
    if (parsed.length === 0) {
      toast.error("Enter at least one phone number.");
      return;
    }
    setUploading(true);
    try {
      const updated = await api.post<Campaign>(
        `/campaigns/${campaignId}/contacts`,
        { contacts: parsed }
      );
      setCampaign(updated);
      setManual("");
      toast.success("Contacts added.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add contacts");
    } finally {
      setUploading(false);
    }
  }

  async function launch() {
    const ok = await confirm({
      title: "Launch campaign?",
      description: `This will place outbound calls to pending contacts and consume credits. Continue?`,
      confirmLabel: "Launch",
    });
    if (!ok) return;
    setLaunching(true);
    try {
      const res = await api.post<CampaignLaunchResult>(
        `/campaigns/${campaignId}/launch`
      );
      toast.success(res.detail);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Launch failed");
    } finally {
      setLaunching(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete campaign?",
      description: "This permanently removes the campaign and its contact list.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/campaigns/${campaignId}`);
      toast.success("Campaign deleted.");
      router.push("/campaigns");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!campaign) return null;

  const pending = campaign.pending_contacts;

  return (
    <div className="space-y-8">
      <PageHeader
        title={campaign.name}
        description={`${campaign.agent_name || "Agent"}${
          campaign.phone_number ? ` · ${campaign.phone_number}` : ""
        }`}
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Campaigns", href: "/campaigns" },
          { label: campaign.name },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/campaigns">
              <Button variant="outline">
                <ArrowLeft className="size-4" /> Back
              </Button>
            </Link>
            <Button variant="outline" onClick={remove}>
              <Trash2 className="size-4" /> Delete
            </Button>
            <Button onClick={launch} disabled={launching || pending === 0}>
              <Play className="size-4" />
              {launching ? "Launching…" : `Launch (${pending})`}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Status" value={<StatusBadge status={campaign.status} />} />
        <StatCard label="Total" value={campaign.total_contacts} />
        <StatCard label="Called" value={campaign.called_contacts} />
        <StatCard label="Pending" value={campaign.pending_contacts} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4 text-primary" /> Add contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Upload CSV file</Label>
            <p className="text-xs text-muted-foreground">
              A CSV with a <code>phone</code> column (and optional{" "}
              <code>name</code> column). No header? We&apos;ll read it as
              name,phone or a single phone column.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              disabled={uploading}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual">Or paste numbers</Label>
            <Textarea
              id="manual"
              rows={4}
              placeholder={"+13155551234, John Doe\n+13155559876"}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={addManual} disabled={uploading}>
              <UserPlus className="size-4" /> Add pasted contacts
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">
            Contacts ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No contacts yet"
              description="Upload a CSV or paste phone numbers above to build your call list."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Phone</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">{c.name || "—"}</td>
                      <td className="py-2 pr-4 tabular-nums">{c.phone}</td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={c.status} />
                        {c.error && (
                          <span className="ml-2 text-xs text-destructive">
                            {c.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
