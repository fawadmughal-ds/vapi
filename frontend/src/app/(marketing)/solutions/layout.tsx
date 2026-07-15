import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { DEFAULT_MARKETING_STORE } from "@/lib/marketing/default-data";
import {
  breadcrumbSchema,
  serviceSchema,
  webPageSchema,
} from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "Solutions & Use Cases — AI Voice Agents by Industry";
const description =
  "See how teams use NextCall AI voice agents for sales outreach, customer support, and appointment reminders — automating calls to cut costs and improve outcomes across industries.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/solutions",
  keywords: [
    "AI sales agent",
    "AI customer support agent",
    "AI appointment reminder calls",
    "AI voice agent use cases",
    "AI outbound sales calling",
    "healthcare AI calling",
  ],
});

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  const services = DEFAULT_MARKETING_STORE.content.useCases.map((uc) =>
    serviceSchema({
      name: `${uc.title} — AI Voice Agents`,
      description: uc.solution,
      path: `/solutions#${uc.id}`,
      serviceType: uc.industry,
    })
  );

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: title,
            description,
            path: "/solutions",
            type: "CollectionPage",
          }),
          ...services,
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Solutions", path: "/solutions" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
