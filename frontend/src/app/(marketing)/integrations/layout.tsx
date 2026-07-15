import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "Integrations — Twilio, SIP Trunks, Webhooks & API";
const description =
  "Connect NextCall to your telephony stack and tools. Native integrations for Twilio, TelephonyX, custom SIP trunks, webhooks, and a developer REST API — with Zapier coming soon.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/integrations",
  keywords: [
    "Twilio AI integration",
    "SIP trunk AI voice",
    "voice AI webhooks",
    "AI calling API",
    "phone number hosting integration",
    "Zapier voice AI",
  ],
});

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, path: "/integrations" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Integrations", path: "/integrations" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
