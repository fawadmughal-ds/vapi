import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "NextCall";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — AI Voice Agents`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Build, deploy, and scale AI voice agents that handle calls, qualify leads, and book appointments — all from one enterprise-grade platform.",
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
