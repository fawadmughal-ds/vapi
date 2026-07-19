"use client";

import Link from "next/link";
import { Building2, ChevronRight, Shield } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { cn, initials } from "@/lib/utils";

export function WorkspaceSwitcher({ compact }: { compact?: boolean }) {
  const { user, isImpersonating, impersonatedName } = useAuth();

  const workspaceName =
    user?.company_name?.trim() ||
    (isImpersonating ? impersonatedName : null) ||
    user?.name ||
    "Workspace";

  const workspaceInitial = workspaceName.slice(0, 1).toUpperCase();

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/60 bg-gradient-to-br from-card/90 to-muted/20 p-3 transition-all hover:border-border hover:shadow-sm",
        compact && "p-2.5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary ring-1 ring-primary/20">
          {initials(workspaceName) || workspaceInitial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold leading-tight">
              {workspaceName}
            </p>
            {isImpersonating && (
              <span className="status-dot status-dot-warning" title="Impersonating" />
            )}
          </div>
          {!compact && (
            <>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {user?.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Building2 className="size-2.5" />
                  Isolated workspace
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                  <Shield className="size-2.5" />
                  Tenant-scoped
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      {!compact && user?.role === "customer" && (
        <Link
          href="/settings"
          className="mt-3 flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          Workspace settings
          <ChevronRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
