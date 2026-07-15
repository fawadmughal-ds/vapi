import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "Security & Compliance — Enterprise AI Voice Platform";
const description =
  "NextCall is built for enterprise security: tenant isolation, role-based access, audit logs, encrypted recordings, signed webhooks, SSO/SAML, and SOC 2 & GDPR-ready architecture.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/security",
  keywords: [
    "AI voice platform security",
    "SOC 2 voice AI",
    "GDPR compliant AI calling",
    "tenant isolation SaaS",
    "enterprise voice AI security",
    "SSO SAML voice platform",
  ],
});

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, path: "/security" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Security", path: "/security" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
