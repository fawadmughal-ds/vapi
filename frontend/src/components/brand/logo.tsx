import Image from "next/image";

import { cn } from "@/lib/utils";

const APP_NAME = "NextCall";

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/nextcall-logo.png"
        alt={`${APP_NAME} logo`}
        width={40}
        height={40}
        priority
        className="size-9 object-contain drop-shadow-[0_0_12px_rgba(245,189,83,0.28)]"
      />
      {showText && (
        <div className="leading-none">
          <span className="text-[15px] font-semibold tracking-tight">
            {APP_NAME}
          </span>
          <span className="block font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-primary/65">
            Voice Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
