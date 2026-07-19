import Link from "next/link";
import { Mail } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FOOTER_LINKS = {
  Product: [
    { href: "/features", label: "Features" },
    { href: "/integrations", label: "Integrations" },
    { href: "/pricing", label: "Pricing" },
    { href: "/security", label: "Security" },
  ],
  Solutions: [
    { href: "/solutions", label: "Use cases" },
    { href: "/solutions#sales", label: "Sales outreach" },
    { href: "/solutions#support", label: "Customer support" },
  ],
  Resources: [
    { href: "/resources", label: "Blog & guides" },
    { href: "/faq", label: "FAQ" },
    { href: "/about", label: "About" },
  ],
  Company: [
    { href: "/contact", label: "Contact" },
    { href: "/contact", label: "Book demo" },
  ],
};

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-card/30">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="pointer-events-none absolute -bottom-48 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-[110px]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The multi-tenant AI voice platform for inbound and outbound calling
              at enterprise scale.
            </p>
            <a
              href="mailto:info@nextcall.online"
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="size-4 text-primary/80" />
              info@nextcall.online
            </a>
            <div className="mt-6 flex gap-2">
              <Input placeholder="Work email" className="h-9 max-w-[200px] text-sm" />
              <Button size="sm">Subscribe</Button>
            </div>
          </div>
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/75">
                {title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {year} NextCall. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              DPA
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
