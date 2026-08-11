"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Key,
  Lock,
  Shield,
  Users,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { WorkspaceSwitcher } from "@/components/saas/workspace-switcher";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", company_name: "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [confirmPw, setConfirmPw] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user)
      setProfile({
        name: user.name,
        company_name: user.company_name || "",
      });
  }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch("/settings/profile", profile);
      await refreshUser();
      toast.success("Workspace profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (
      pw.new_password.length < 8 ||
      !/[A-Za-z]/.test(pw.new_password) ||
      !/\d/.test(pw.new_password)
    ) {
      toast.error("New password needs 8+ characters with a letter and a number");
      return;
    }
    if (pw.new_password !== confirmPw) {
      toast.error("New passwords don't match");
      return;
    }
    setSavingPw(true);
    try {
      await api.post("/settings/password", pw);
      setPw({ current_password: "", new_password: "" });
      setConfirmPw("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Change failed");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workspace settings"
        description="Manage your profile, security, team access, and enterprise controls for this isolated workspace."
        breadcrumbs={[
          { label: "Workspace", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      <WorkspaceSwitcher />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">
            <Building2 className="size-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="size-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="size-3.5" /> Team
          </TabsTrigger>
          <TabsTrigger value="developers">
            <Key className="size-3.5" /> Developers
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="size-3.5" /> Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="glass-card max-w-xl">
            <CardHeader>
              <CardTitle className="text-base">Workspace profile</CardTitle>
              <CardDescription>
                This information appears on invoices and internal audit logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company / workspace name</Label>
                  <Input
                    value={profile.company_name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, company_name: e.target.value }))
                    }
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your login email.
                  </p>
                </div>
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile && <Spinner />} Save profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="grid max-w-3xl gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Password</CardTitle>
                <CardDescription>
                  Use a strong, unique password for workspace access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={changePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current password</Label>
                    <Input
                      type="password"
                      value={pw.current_password}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, current_password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New password</Label>
                    <Input
                      type="password"
                      value={pw.new_password}
                      onChange={(e) =>
                        setPw((p) => ({ ...p, new_password: e.target.value }))
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters, including a letter and a number.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm new password</Label>
                    <Input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                    />
                    {confirmPw.length > 0 && confirmPw !== pw.new_password && (
                      <p className="text-xs text-destructive">
                        Passwords don&apos;t match
                      </p>
                    )}
                  </div>
                  <Button type="submit" disabled={savingPw}>
                    {savingPw && <Spinner />} Update password
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="glass-card border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Single sign-on (SSO)</CardTitle>
                <CardDescription>Enterprise plan feature</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Connect Okta, Azure AD, or Google Workspace for centralized
                  authentication. Available on Enterprise plans.
                </p>
                <Button variant="outline" className="mt-4" disabled>
                  Configure SSO
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card className="glass-card max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Team & permissions</CardTitle>
              <CardDescription>
                Invite colleagues and assign roles within this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-8 text-center">
                <Users className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">Team management coming soon</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Roles: Owner, Admin, Operator, Viewer — with granular permissions
                  for agents, numbers, billing, and integrations.
                </p>
                <Button variant="outline" className="mt-4" disabled>
                  Invite team member
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="developers" className="mt-6">
          <div className="grid max-w-3xl gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="size-4" /> API keys
                </CardTitle>
                <CardDescription>
                  Programmatic access to your workspace resources.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Generate scoped API keys for CRM integrations, custom dashboards,
                  and automation workflows.
                </p>
                <Button variant="outline" className="mt-4" disabled>
                  Create API key
                </Button>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Webhook className="size-4" /> Webhooks
                </CardTitle>
                <CardDescription>
                  Receive real-time events for calls, agents, and billing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure endpoint URLs to receive signed payloads when calls
                  complete, agents publish, or credits are consumed.
                </p>
                <Button variant="outline" className="mt-4" disabled>
                  Add webhook endpoint
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <Card className="glass-card max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Compliance & data</CardTitle>
              <CardDescription>
                Enterprise-grade data handling and audit visibility.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                All workspace data — agents, calls, recordings, and integrations —
                is isolated to your tenant. Platform administrators cannot access
                call content without explicit impersonation, which is audit-logged.
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs">
                <li>Call recordings retained per your plan retention policy</li>
                <li>Audit logs available for workspace activity</li>
                <li>Data export and deletion requests supported on Enterprise</li>
                <li>SOC 2 and GDPR documentation available on request</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
