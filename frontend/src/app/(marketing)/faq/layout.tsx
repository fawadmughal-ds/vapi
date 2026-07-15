import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { DEFAULT_MARKETING_STORE } from "@/lib/marketing/default-data";
import { breadcrumbSchema, faqSchema, webPageSchema } from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "FAQ — AI Voice Agents, Telephony, Pricing & Security";
const description =
  "Answers to common questions about NextCall AI voice agents: how they work, supported phone providers (Twilio, SIP), free trial, tenant data isolation, and usage-based billing.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/faq",
  keywords: [
    "AI voice agent FAQ",
    "how do AI voice agents work",
    "AI calling questions",
    "voice AI providers",
    "AI phone agent free trial",
  ],
});

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  const faqs = DEFAULT_MARKETING_STORE.content.faqs.map((f) => ({
    question: f.question,
    answer: f.answer,
  }));

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, path: "/faq" }),
          faqSchema(faqs),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
