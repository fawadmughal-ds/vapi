import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "About NextCall — The AI Voice Operating System";
const description =
  "NextCall builds the operating system for AI-powered voice communication, helping any business deploy intelligent phone agents at scale with a secure multi-tenant platform.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/about",
  keywords: [
    "about NextCall",
    "AI voice company",
    "voice AI platform company",
    "AI phone agent provider",
  ],
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: title,
            description,
            path: "/about",
            type: "AboutPage",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
