import type { Metadata } from "next";

/**
 * Central SEO configuration. Change SITE_URL here (or via NEXT_PUBLIC_SITE_URL)
 * and every canonical, Open Graph, sitemap, and JSON-LD reference updates.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nextcall.online"
).replace(/\/$/, "");

export const SITE_NAME = "NextCall";
export const SITE_LEGAL_NAME = "NextCall";
export const SITE_TAGLINE = "AI Voice Agent Platform";

export const SITE_DESCRIPTION =
  "NextCall is the AI voice agent platform for inbound and outbound phone calls. Deploy an AI receptionist, AI sales agent, and AI call center with multi-provider telephony (Twilio & SIP), campaigns, analytics, and enterprise multi-tenant workspaces.";

export const OG_IMAGE = "/nextcall-og.png";

export const TWITTER_HANDLE = "@nextcall";

/** Google Search Console site verification token. */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  "wBrW8j9ZgkbcosAbtQbG8RQ7iUXT2M19cUR_Urj-hwU";

/** Google Analytics 4 measurement ID (gtag.js). */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-6VF5N0L3L7";

/** Brand-level keywords reused as sensible defaults across the site. */
export const GLOBAL_KEYWORDS = [
  "AI voice agents",
  "AI phone calls",
  "AI receptionist",
  "voice AI",
  "AI calling",
  "AI call center",
  "conversational AI",
  "AI customer support",
  "AI sales agent",
  "AI booking assistant",
  "business phone AI",
  "SIP calling",
  "phone number hosting",
  "AI automation",
  "outbound calling software",
  "inbound call automation",
];

export type PageSeo = {
  title: string;
  description: string;
  /** Path beginning with "/". Used for canonical + OG url. */
  path: string;
  keywords?: string[];
  /** Set false for private/utility pages that must not be indexed. */
  index?: boolean;
  ogImage?: string;
};

/**
 * Builds a complete, unique Metadata object for a page. Handles canonical URL,
 * Open Graph, Twitter cards, and robots directives consistently.
 */
export function buildMetadata({
  title,
  description,
  path,
  keywords,
  index = true,
  ogImage = OG_IMAGE,
}: PageSeo): Metadata {
  const canonical = path === "/" ? "/" : path.replace(/\/$/, "");
  const url = `${SITE_URL}${canonical === "/" ? "" : canonical}`;
  // Use an absolute title so the parent template ("%s · NextCall") is not
  // applied on top of these already-complete, self-branded titles.
  const absoluteTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;

  return {
    title: { absolute: absoluteTitle },
    description,
    keywords: keywords && keywords.length > 0 ? keywords : GLOBAL_KEYWORDS,
    alternates: { canonical },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: TWITTER_HANDLE,
      site: TWITTER_HANDLE,
    },
  };
}
