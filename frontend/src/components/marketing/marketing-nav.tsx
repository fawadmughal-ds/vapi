"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useMarketing } from "@/lib/marketing/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/integrations", label: "Integrations" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
  { href: "/security", label: "Security" },
  { href: "/contact", label: "Contact" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const { store } = useMarketing();
  const [open, setOpen] = useState(false);
  const hero = store.content.hero;

  return (
    <>
      {store.content.announcement && (
        <div className="border-b border-primary/20 bg-primary/[0.07] px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
          <span className="mr-2 inline-block size-1.5 rounded-full bg-primary animate-pulse-signal" />
          {store.content.announcement}
        </div>
      )}
      <header className="sticky top-0 z-50 border-b border-primary/15 bg-background/70 backdrop-blur-2xl">
        
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          <Link href="/">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-chamfer-sm px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-primary/[0.05] hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href={hero.primaryCtaUrl}>
              <Button size="sm">{hero.primaryCta}</Button>
            </Link>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>

        {open && (
          <div className="border-t border-border/50 bg-background/95 px-4 py-4 backdrop-blur-2xl lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-primary/10"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 flex gap-2">
                <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href={hero.primaryCtaUrl} className="flex-1" onClick={() => setOpen(false)}>
                  <Button className="w-full" size="sm">
                    {hero.primaryCta}
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
