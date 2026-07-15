import {
  SITE_DESCRIPTION,
  SITE_LEGAL_NAME,
  SITE_NAME,
  SITE_URL,
} from "./site";

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const SOFTWARE_ID = `${SITE_URL}/#software`;

const abs = (path: string) =>
  path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

/** Organization entity — establishes the brand for Knowledge Panel + AI search. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: abs("/nextcall-logo.png"),
      width: 512,
      height: 512,
    },
    image: abs("/nextcall-og.png"),
    description: SITE_DESCRIPTION,
    slogan: "AI voice agents that call, answer, qualify, and convert at scale.",
    foundingDate: "2025",
    knowsAbout: [
      "AI voice agents",
      "Conversational AI",
      "AI phone calls",
      "Telephony automation",
      "AI call centers",
      "SIP calling",
    ],
    email: "info@nextcall.online",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "info@nextcall.online",
        url: abs("/contact"),
        availableLanguage: ["English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "info@nextcall.online",
        url: abs("/contact"),
        availableLanguage: ["English"],
      },
    ],
  };
}

/** WebSite entity with SearchAction (enables sitelinks search box eligibility). */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en-US",
    publisher: { "@id": ORG_ID },
  };
}

/** SoftwareApplication — makes the product eligible for rich software results. */
export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": SOFTWARE_ID,
    name: `${SITE_NAME} — AI Voice Agent Platform`,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "AI Voice Agents",
    operatingSystem: "Web",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    image: abs("/nextcall-og.png"),
    publisher: { "@id": ORG_ID },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "14-day free trial, no credit card required.",
      url: abs("/pricing"),
    },
    featureList: [
      "AI voice agents for inbound and outbound calls",
      "Multi-provider telephony (Twilio, SIP, TelephonyX)",
      "Outbound campaign automation",
      "Call recordings, transcripts, and AI summaries",
      "Call analytics and agent performance",
      "Multi-tenant workspaces with role-based access",
    ],
  };
}

/** BreadcrumbList from ordered { name, path } items. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

/** WebPage entity linking a page to the site/org graph. */
export function webPageSchema({
  name,
  description,
  path,
  type = "WebPage",
}: {
  name: string;
  description: string;
  path: string;
  type?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name,
    description,
    url: abs(path),
    inLanguage: "en-US",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    primaryImageOfPage: abs("/nextcall-og.png"),
  };
}

/** FAQPage from question/answer pairs — eligible for FAQ rich results + AEO. */
export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** Product with an OfferCatalog built from pricing plans. */
export function pricingProductSchema(
  plans: { planName: string; description: string; monthlyPrice: number; ctaUrl: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${SITE_NAME} AI Voice Agent Platform`,
    description: SITE_DESCRIPTION,
    image: abs("/nextcall-og.png"),
    brand: { "@id": ORG_ID },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...plans.map((p) => p.monthlyPrice)),
      highPrice: Math.max(...plans.map((p) => p.monthlyPrice)),
      offerCount: plans.length,
      offers: plans.map((p) => ({
        "@type": "Offer",
        name: p.planName,
        description: p.description,
        price: p.monthlyPrice,
        priceCurrency: "USD",
        url: abs(p.ctaUrl),
        availability: "https://schema.org/InStock",
      })),
    },
  };
}

/** Service entity for solutions/use-case content. */
export function serviceSchema({
  name,
  description,
  path,
  serviceType,
}: {
  name: string;
  description: string;
  path: string;
  serviceType: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType,
    url: abs(path),
    provider: { "@id": ORG_ID },
    areaServed: "Worldwide",
  };
}
