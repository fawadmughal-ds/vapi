import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "Resources — AI Calling Guides, Case Studies & Best Practices";
const description =
  "Guides, case studies, and best practices for deploying AI voice agents at scale — from outbound calling scripts and compliance to multi-tenant voice AI architecture.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/resources",
  keywords: [
    "AI calling guide",
    "AI voice agent best practices",
    "outbound calling case study",
    "conversational AI resources",
    "voice AI architecture",
  ],
});

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: title,
            description,
            path: "/resources",
            type: "CollectionPage",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Resources", path: "/resources" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
