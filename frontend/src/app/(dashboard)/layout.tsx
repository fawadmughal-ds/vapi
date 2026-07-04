"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Ban, LogOut } from "lucide-react";

import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/topnav";
import { Button } from "@/components/ui/button";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import { SubscriptionProvider, useSubscription } from "@/lib/subscription";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <FullPageSpinner />;

  return (
    <SubscriptionProvider>
      <DashboardShell>{children}</DashboardShell>
    </SubscriptionProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { outOfCredits } = useSubscription();
  const [mobileOpen, setMobileOpen] = useState(false);

  const locked = outOfCredits && user?.role === "customer";

  if (locked) {
    return (
      <div className="saas-shell-bg flex h-screen flex-col overflow-hidden">
        <ImpersonationBanner />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="glass-panel max-w-md rounded-2xl p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
              <Ban className="size-7 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              Workspace paused — out of credits
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your workspace has exhausted its credit allowance. Calling, agents,
              and automation are paused until your administrator adds credits or
              you upgrade your plan.
            </p>
            <Button variant="outline" className="mt-6" onClick={logout}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="saas-shell-bg flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full shadow-2xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        <TopNav onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
