import Link from "next/link";
import {
  Eye,
  FileCheck,
  Key,
  Lock,
  Server,
  Shield,
  Users,
  Webhook,
} from "lucide-react";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";

const ITEMS = [
  { icon: Lock, title: "Data protection", desc: "Encryption in transit and at rest. Secure credential storage for provider API keys." },
  { icon: Server, title: "Tenant isolation", desc: "Every workspace has isolated agents, calls, numbers, billing, and API keys." },
  { icon: Key, title: "API key protection", desc: "Scoped API keys with rotation. Keys never exposed in client-side code." },
  { icon: Users, title: "Role-based access", desc: "Owner, Admin, Operator, and Viewer roles with granular permissions." },
  { icon: Eye, title: "Audit logs", desc: "Every admin action and impersonation session is logged and reviewable." },
  { icon: FileCheck, title: "Call recording security", desc: "Recordings stored securely with tenant-scoped access controls." },
  { icon: Webhook, title: "Webhook security", desc: "Signed webhook payloads with secret validation on every event." },
  { icon: Shield, title: "Compliance-ready", desc: "Architecture designed for SOC 2, GDPR, and enterprise security reviews." },
];

export default function SecurityPage() {
  return (
    <MarketingPageShell
      title="Security & compliance"
      description="Built for teams that need enterprise-grade security, tenant isolation, and auditability from day one."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <div key={item.title} className="glass-card p-6">
            <item.icon className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="glass-card border-dashed p-6">
          <h3 className="font-semibold">SSO / SAML</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Single sign-on with Okta, Azure AD, and Google Workspace. Available on Enterprise plans.
          </p>
        </div>
        <div className="glass-card border-dashed p-6">
          <h3 className="font-semibold">SOC 2 & GDPR</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Compliance documentation and DPA available for enterprise customers.
          </p>
        </div>
      </div>
      <div className="mt-10 text-center">
        <Link href="/contact">
          <Button>Request security documentation</Button>
        </Link>
      </div>
    </MarketingPageShell>
  );
}
