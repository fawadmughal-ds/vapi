import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { DEFAULT_MARKETING_STORE } from "@/lib/marketing/default-data";
import {
  breadcrumbSchema,
  faqSchema,
  pricingProductSchema,
  webPageSchema,
} from "@/lib/seo/schema";
import { buildMetadata } from "@/lib/seo/site";

const title = "Pricing — AI Voice Agent Plans from Free Trial to Enterprise";
const description =
  "Simple, transparent pricing for AI voice agents. Start with a 14-day free trial, then scale from Starter to Enterprise with call minutes, agents, phone numbers, and campaigns included.";

export const metadata: Metadata = buildMetadata({
  title,
  description,
  path: "/pricing",
  keywords: [
    "AI voice agent pricing",
    "AI calling software pricing",
    "voice AI plans",
    "AI call center cost",
    "AI phone agent free trial",
    "per minute AI calling price",
  ],
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  const plans = DEFAULT_MARKETING_STORE.pricing.plans
    .filter((p) => p.isVisible && !p.isEnterprise)
    .map((p) => ({
      planName: p.planName,
      description: p.description,
      monthlyPrice: p.monthlyPrice,
      ctaUrl: p.ctaUrl,
    }));

  const pricingFaqs = DEFAULT_MARKETING_STORE.content.faqs
    .filter((f) => f.category === "Pricing" || f.category === "Billing")
    .map((f) => ({ question: f.question, answer: f.answer }));

  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({ name: title, description, path: "/pricing" }),
          pricingProductSchema(plans),
          faqSchema(pricingFaqs),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Pricing", path: "/pricing" },
          ]),
        ]}
      />
      {children}
    </>
  );
}
