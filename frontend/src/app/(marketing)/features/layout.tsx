import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "AI Voice Agent Features — Calling, Analytics & Automation";
const description =
  "Explore NextCall features: AI voice agents, inbound and outbound calling, multi-provider telephony, campaign automation, call recordings, transcripts, AI summaries, analytics, webhooks, and API access.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/features",
  keywords: [
    "AI voice agent features",
    "AI calling software features",
    "outbound calling automation",
    "inbound call AI",
    "call transcription AI",
    "AI call analytics",
    "voice AI API",
    "call recording software",
  ],
});

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, path: "/features" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Features", path: "/features" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
