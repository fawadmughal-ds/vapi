import type { Metadata } from "next";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { DEFAULT_MARKETING_STORE } from "@/lib/marketing/default-data";

const seo = DEFAULT_MARKETING_STORE.content.seo;

export const metadata: Metadata = {
  title: {
    default: seo.defaultTitle,
    template: "%s | VoxaAI",
  },
  description: seo.defaultDescription,
  openGraph: {
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    type: "website",
    siteName: "VoxaAI",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.defaultTitle,
    description: seo.defaultDescription,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="saas-shell-bg min-h-screen">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
