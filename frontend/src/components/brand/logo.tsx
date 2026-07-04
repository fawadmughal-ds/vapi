import { AudioLines } from "lucide-react";

import { cn } from "@/lib/utils";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "VoxaAI";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-cyan-500 text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--glow-primary)/0.5)] ring-1 ring-white/10">
        <AudioLines className="size-[18px]" />
      </div>
      {showText && (
        <div className="leading-none">
          <span className="text-[15px] font-semibold tracking-tight">
            {APP_NAME}
          </span>
          <span className="block text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
            Voice OS
          </span>
        </div>
      )}
    </div>
  );
}
