"use client";

import Link from "next/link";
import {
  BarChart3,
  Bot,
  Brain,
  FileText,
  Key,
  Lock,
  Phone,
  PhoneCall,
  Plug,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Bot, title: "AI Voice Agents", desc: "Configure voice, model, system prompt, first message, and tools. Publish to production infrastructure in one click." },
  { icon: PhoneCall, title: "Inbound Calling", desc: "Route incoming calls to AI agents. Handle support, qualification, and booking 24/7." },
  { icon: Phone, title: "Outbound Calling", desc: "Place calls programmatically or via campaigns. Connect leads at scale." },
  { icon: Plug, title: "Multi-Provider Connections", desc: "Twilio, TelephonyX, Vonage, Telnyx, SIP trunks, and custom providers." },
  { icon: Phone, title: "Phone Number Management", desc: "Provision, import, assign, and release numbers per workspace." },
  { icon: Workflow, title: "Campaign Automation", desc: "Batch outbound campaigns with scheduling, retry logic, and outcome tracking." },
  { icon: FileText, title: "Call Recording & Transcripts", desc: "Every conversation recorded with searchable transcripts." },
  { icon: Brain, title: "AI Call Summaries", desc: "Automatic post-call summaries with key points and action items." },
  { icon: BarChart3, title: "Call Analytics", desc: "Success rates, duration, cost, agent performance, and trend charts." },
  { icon: Webhook, title: "Webhooks", desc: "Real-time events for call lifecycle, agent updates, and billing." },
  { icon: Key, title: "API Access", desc: "REST API for agents, calls, numbers, and workspace management." },
  { icon: Users, title: "Team & Permissions", desc: "Role-based access for owners, admins, operators, and viewers." },
  { icon: Lock, title: "Multi-Tenant Workspaces", desc: "Fully isolated data, billing, providers, and settings per tenant." },
];

export default function FeaturesPage() {
  return (
    <MarketingPageShell
      title="Platform features"
      description="Everything you need to build, deploy, and scale AI voice operations — from a single multi-tenant control plane."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass-card-hover p-6">
            <f.icon className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Link href="/register">
          <Button size="lg">Start free trial</Button>
        </Link>
      </div>
    </MarketingPageShell>
  );
}
