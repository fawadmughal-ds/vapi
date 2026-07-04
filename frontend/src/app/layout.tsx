import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "VoxaAI";

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
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
