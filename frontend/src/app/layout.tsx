import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const APP_NAME = "NextCall";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nextcall.online"),
  title: {
    default: `${APP_NAME} — AI Voice Agents`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Build, deploy, and scale AI voice agents that handle calls, qualify leads, and book appointments — all from one enterprise-grade platform.",
  openGraph: {
    title: `${APP_NAME} — AI Voice Agent Platform`,
    description:
      "Build, deploy, and scale AI voice agents from one enterprise-grade platform.",
    type: "website",
    siteName: APP_NAME,
    images: [{ url: "/nextcall-og.png", width: 1200, height: 630, alt: "NextCall" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — AI Voice Agent Platform`,
    description:
      "Build, deploy, and scale AI voice agents from one enterprise-grade platform.",
    images: ["/nextcall-og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
