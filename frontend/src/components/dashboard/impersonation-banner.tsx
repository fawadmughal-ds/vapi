"use client";

import { Eye, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedName, stopImpersonating } = useAuth();

  if (!isImpersonating) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <Eye className="size-4" />
      <span>
        Viewing as <strong>{impersonatedName ?? "customer"}</strong> — actions
        you take are logged.
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 bg-amber-950 text-amber-50 hover:bg-amber-900"
        onClick={() => stopImpersonating()}
      >
        <X className="size-3.5" /> Exit
      </Button>
    </div>
  );
}
