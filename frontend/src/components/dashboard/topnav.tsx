"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  User as UserIcon,
} from "lucide-react";

import { PlanBadge } from "@/components/saas/plan-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { cn, formatNumber, initials } from "@/lib/utils";

export function TopNav({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { subscription: sub } = useSubscription();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allowance = sub ? sub.credit_limit + (sub.topup_credits || 0) : 0;
  const usagePct = sub
    ? Math.min((sub.credits_used / Math.max(allowance, 1)) * 100, 100)
    : 0;
  const isAdmin = user?.role === "super_admin";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenu}
      >
        <Menu className="size-5" />
      </Button>

      <div className="hidden min-w-0 flex-1 md:block">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Search agents, calls, numbers…"
            className="h-10 w-full rounded-chamfer border border-border bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all duration-200 focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15"
            readOnly
            title="Global search coming soon"
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        {sub && !isAdmin && (
          <Link
            href="/billing"
            className="hidden min-w-[150px] rounded-chamfer border border-border bg-card px-3 py-2 transition-colors hover:border-primary/30 hover:bg-accent/50 lg:block"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Credits
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] font-semibold tabular-nums",
                  sub.credits_remaining <= 0 && "text-destructive"
                )}
              >
                {formatNumber(Math.max(Math.round(sub.credits_remaining), 0))}
              </span>
            </div>
            <Progress
              value={usagePct}
              className={cn("h-1", usagePct > 90 && "[&>div]:bg-destructive")}
            />
          </Link>
        )}

        {sub && !isAdmin && (
          <div className="hidden sm:block">
            <PlanBadge plan={sub.plan} status={sub.status} />
          </div>
        )}

        <Button variant="ghost" size="icon" className="relative size-9">
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary ring-2 ring-background animate-pulse-signal" />
        </Button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-chamfer border border-transparent py-1 pl-1 pr-2 transition-all duration-200 hover:bg-muted"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials(user?.name)}
            </span>
            <span className="hidden max-w-[120px] truncate text-sm font-medium lg:block">
              {user?.name}
            </span>
            <ChevronDown className="hidden size-3.5 text-muted-foreground lg:block" />
          </button>

          {open && (
            <div className="glass-panel absolute right-0 mt-2 w-60 overflow-hidden p-1 shadow-2xl animate-in">
              <div className="border-b border-border/60 px-3 py-2.5">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
                {sub && !isAdmin && (
                  <div className="mt-2">
                    <PlanBadge plan={sub.plan} status={sub.status} />
                  </div>
                )}
              </div>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <UserIcon className="size-4 opacity-70" /> Profile & workspace
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <Settings className="size-4 opacity-70" /> Settings
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
