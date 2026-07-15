import type { Metadata } from "next";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { buildMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildMetadata({
  title: "NextCall — AI Voice Agents for Inbound & Outbound Phone Calls",
  description:
    "Deploy AI voice agents that answer calls, qualify leads, and book appointments. NextCall combines an AI receptionist, AI call center, and outbound campaigns with Twilio & SIP telephony, analytics, and multi-tenant workspaces.",
  path: "/",
  keywords: [
    "AI voice agents",
    "AI phone calls",
    "AI receptionist",
    "AI call center software",
    "voice AI platform",
    "AI calling software",
    "AI sales agent",
    "AI customer support agent",
    "conversational AI phone",
    "Twilio AI voice agent",
  ],
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="saas-shell-bg min-h-screen">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
