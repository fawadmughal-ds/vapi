import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "Contact Sales & Book a Demo — NextCall AI Voice Agents";
const description =
  "Talk to the NextCall team about AI voice agents for your business. Book a demo, get enterprise pricing, and plan your inbound and outbound calling deployment.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/contact",
  keywords: [
    "book AI voice agent demo",
    "contact AI calling platform",
    "enterprise voice AI pricing",
    "AI call center demo",
  ],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: title,
            description,
            path: "/contact",
            type: "ContactPage",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
