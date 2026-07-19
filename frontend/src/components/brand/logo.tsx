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
    <div className={cn("group flex items-center gap-2.5", className)}>
      <span className="relative inline-flex transition-transform duration-300 ease-out group-hover:scale-105">
        <Image
          src="/nextcall-logo.png"
          alt={`${APP_NAME} logo`}
          width={40}
          height={40}
          priority
          className="relative size-9 object-contain"
        />
      </span>
      {showText && (
        <div className="leading-none">
          <span className="text-[15px] font-semibold tracking-tight">
            {APP_NAME}
          </span>
          <span className="block text-[10px] font-medium text-muted-foreground">
            AI Voice Platform
          </span>
        </div>
      )}
    </div>
  );
}
