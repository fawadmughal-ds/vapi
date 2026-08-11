"use client";

import { Toaster } from "sonner";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { AuthProvider } from "@/lib/auth";
import { MarketingProvider } from "@/lib/marketing/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MarketingProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </MarketingProvider>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
            boxShadow: "0 12px 32px -12px hsl(240 30% 2% / 0.9)",
          },
        }}
      />
    </AuthProvider>
  );
}
