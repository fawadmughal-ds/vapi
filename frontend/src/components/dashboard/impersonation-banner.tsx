"use client";

import { Eye, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedName, stopImpersonating } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="flex items-center justify-center gap-3 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 backdrop-blur-xl">
      <Eye className="size-4" />
      <span>
        Viewing as <strong>{impersonatedName ?? "customer"}</strong> — actions
        you take are logged.
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 border border-amber-300/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/25"
        onClick={() => stopImpersonating()}
      >
        <X className="size-3.5" /> Exit
      </Button>
    </div>
  );
}
