"use client";

import { Toaster } from "sonner";

import { AuthProvider } from "@/lib/auth";
import { MarketingProvider } from "@/lib/marketing/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MarketingProvider>
        {children}
      </MarketingProvider>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(224 39% 9%)",
            border: "1px solid hsl(223 26% 18%)",
            color: "hsl(210 40% 98%)",
          },
        }}
      />
    </AuthProvider>
  );
}
