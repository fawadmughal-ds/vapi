import Link from "next/link";
import { Building2, PhoneCall, Shield, Zap } from "lucide-react";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="saas-shell-bg grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 lg:px-10">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[400px] animate-slide-up">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground/60 lg:text-left">
          Enterprise-grade AI voice infrastructure · SOC 2 ready · Tenant isolated
        </p>
      </div>
      <div className="relative hidden overflow-hidden border-l border-border/50 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-cyan-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--glow-cyan)/0.12),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            AI Voice Operating System
          </p>
          <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Deploy AI phone agents that scale with your business
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Manage agents, phone numbers, providers, campaigns, and call analytics
            from one secure workspace — built for teams that run on voice.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              {
                icon: Building2,
                title: "Isolated workspaces",
                desc: "Each tenant gets dedicated data, billing, and usage limits.",
              },
              {
                icon: PhoneCall,
                title: "Production telephony",
                desc: "Twilio, SIP, and provider integrations with live call routing.",
              },
              {
                icon: Shield,
                title: "Enterprise controls",
                desc: "Roles, audit logs, API keys, and compliance-ready architecture.",
              },
              {
                icon: Zap,
                title: "Minutes to live",
                desc: "Guided setup from agent creation to your first inbound call.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <item.icon className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
