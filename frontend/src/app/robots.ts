import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site";

/** Private/authenticated areas that must never be indexed. */
const DISALLOW = [
  "/api/",
  "/admin",
  "/dashboard",
  "/agents",
  "/calls",
  "/billing",
  "/analytics",
  "/phone-numbers",
  "/providers",
  "/squads",
  "/orders",
  "/tools",
  "/campaigns",
  "/knowledge-base",
  "/settings",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
