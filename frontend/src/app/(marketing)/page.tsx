"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Phone,
  PhoneCall,
  Plug,
  Shield,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";

import { PricingCards } from "@/components/marketing/pricing-cards";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { Button } from "@/components/ui/button";
import { useMarketing } from "@/lib/marketing/store";

const METRICS = [
  { value: "10M+", label: "Calls handled" },
  { value: "99.9%", label: "Platform uptime" },
  { value: "<300ms", label: "Voice latency" },
  { value: "50+", label: "Countries supported" },
];

const TRUST = ["SOC 2 Ready", "GDPR Compliant", "Tenant Isolated", "Encrypted at Rest"];

export default function HomePage() {
  const { store } = useMarketing();
  const { hero, testimonials } = store.content;

  // Render the last two words of the headline with the gradient treatment.
  const headlineWords = hero.headline.trim().split(/\s+/);
  const gradientFrom = Math.max(headlineWords.length - 2, 0);
  const headlinePlain = headlineWords.slice(0, gradientFrom).join(" ");
  const headlineGradient = headlineWords.slice(gradientFrom).join(" ");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="hero-grid-bg absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.10),transparent_60%)]" />
        <div className="absolute -right-24 top-0 size-[32rem] rounded-full bg-primary/[0.09] blur-[120px] animate-aurora" />
        <div className="absolute -left-32 top-40 size-[26rem] rounded-full bg-[hsl(var(--glow-cyan)/0.06)] blur-[110px] animate-aurora [animation-delay:-7s]" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-slide-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" />
                {hero.badge}
              </div>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.7rem]">
                {headlinePlain}{" "}
                <span className="text-gradient animate-gradient-pan">
                  {headlineGradient}
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {hero.subheadline}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={hero.primaryCtaUrl}>
                  <Button size="lg" className="gap-2">
                    {hero.primaryCta} <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href={hero.secondaryCtaUrl}>
                  <Button size="lg" variant="outline">
                    {hero.secondaryCta}
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {TRUST.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border/70 bg-card/35 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Product mockup */}
            <div className="relative hidden lg:block">
              <div className="absolute left-1/2 top-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_180deg,hsl(var(--glow-cyan)/0.16),hsl(var(--primary)/0.2),hsl(288_85%_62%/0.14),hsl(var(--glow-cyan)/0.16))] blur-[70px]" />
              <div className="glass-panel overflow-hidden animate-float border-primary/20">
                <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
                  <div className="size-2.5 rounded-full bg-red-400/80" />
                  <div className="size-2.5 rounded-full bg-amber-400/80" />
                  <div className="size-2.5 rounded-full bg-success/80" />
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    Workspace · Live calls
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  {[
                    { agent: "Sales Qualifier", status: "live", num: "+1 (415) 555-0142" },
                    { agent: "Support Line", status: "completed", num: "+1 (212) 555-0199" },
                    { agent: "Booking Agent", status: "ringing", num: "+44 20 7946 0958" },
                  ].map((c) => (
                    <div
                      key={c.agent}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            c.status === "live"
                              ? "status-dot status-dot-live"
                              : c.status === "ringing"
                                ? "status-dot status-dot-warning"
                                : "status-dot bg-muted-foreground/30"
                          }
                        />
                        <div>
                          <p className="text-sm font-medium">{c.agent}</p>
                          <p className="text-xs text-muted-foreground">{c.num}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        {c.status}
                      </span>
                    </div>
                  ))}
                  {/* Waveform visual — live equalizer */}
                  <div className="flex h-12 items-center justify-center gap-1 rounded-xl border border-primary/15 bg-primary/[0.07] px-4 py-2">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className="wave-bar w-1"
                        style={{
                          height: `${Math.round(16 + Math.abs(Math.sin(i * 0.55)) * 22)}px`,
                          animationDelay: `${((i % 8) * 0.11).toFixed(2)}s`,
                          animationDuration: `${(0.9 + (i % 5) * 0.12).toFixed(2)}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="border-b border-border/40 bg-card/[0.025] py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 lg:grid-cols-4 lg:px-8">
          {METRICS.map((m) => (
            <div key={m.label} className="text-center">
              <p className="font-mono text-2xl font-semibold tracking-tight text-gradient">
                <AnimatedCounter value={m.value} duration={1400} />
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features overview */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="telemetry-label mb-3">One unified command surface</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to run voice AI at scale
            </h2>
            <p className="mt-4 text-muted-foreground">
              From agent creation to campaign automation — one platform for the
              entire call lifecycle.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Bot, title: "AI Voice Agents", desc: "Human-like agents with custom voices, models, and instructions." },
              { icon: Phone, title: "Multi-Provider Telephony", desc: "Twilio, SIP, TelephonyX, and custom provider connections." },
              { icon: PhoneCall, title: "Inbound & Outbound", desc: "Handle support lines and run outbound campaigns from one place." },
              { icon: Workflow, title: "Campaign Automation", desc: "Schedule, batch, and track outbound call campaigns." },
              { icon: BarChart3, title: "Analytics & Insights", desc: "Success rates, duration, transcripts, and agent performance." },
              { icon: Building2, title: "Multi-Tenant Workspaces", desc: "Isolated data, billing, and teams per workspace." },
            ].map((f) => (
              <div key={f.title} className="glass-card-hover p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-transparent text-primary ring-1 ring-primary/15">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/features">
              <Button variant="outline">
                Explore all features <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/40 bg-muted/10 py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Go live in four steps
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { step: "01", title: "Connect providers", desc: "Link Twilio, SIP, or custom telephony.", icon: Plug },
              { step: "02", title: "Create agents", desc: "Configure voice, prompts, tools, and knowledge.", icon: Bot },
              { step: "03", title: "Assign numbers", desc: "Route inbound and outbound through agents.", icon: Phone },
              { step: "04", title: "Launch & optimize", desc: "Run campaigns, review analytics, iterate.", icon: Zap },
            ].map((s) => (
              <div key={s.step} className="relative glass-card p-6">
                <span className="font-mono text-xs font-bold tracking-[0.12em] text-primary">{s.step}</span>
                <s.icon className="mt-3 size-5 text-muted-foreground" />
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-20" id="pricing">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              Plans configured by our team — always in sync with what you see at checkout.
            </p>
          </div>
          <div className="mt-12">
            <PricingCards compact showToggle />
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing">
              <Button variant="link" className="gap-1">
                Compare all plans & features <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Trusted by operations teams
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote key={t.id} className="glass-card p-6">
                <p className="text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 border-t border-border/40 pt-4">
                  <p className="text-sm font-medium">{t.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}, {t.company}
                  </p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Security preview */}
      <section className="border-t border-border/40 bg-muted/10 py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center lg:px-8">
          <Shield className="size-10 text-primary" />
          <h2 className="text-2xl font-semibold">Enterprise-grade security</h2>
          <p className="max-w-xl text-muted-foreground">
            Tenant isolation, RBAC, audit logs, encrypted recordings, and
            compliance-ready architecture.
          </p>
          <Link href="/security">
            <Button variant="outline">Learn about security</Button>
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="aurora-border glass-panel relative mx-auto max-w-4xl px-6 py-14 text-center lg:px-12">
          <div className="pointer-events-none absolute -top-24 left-1/2 size-[22rem] -translate-x-1/2 rounded-full bg-primary/[0.10] blur-[90px]" />
          <p className="telemetry-label mb-4">Ready when you are</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to deploy AI voice agents?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start your free trial or book a demo with our team.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href={hero.primaryCtaUrl}>
              <Button size="lg">{hero.primaryCta}</Button>
            </Link>
            <Link href={hero.secondaryCtaUrl}>
              <Button size="lg" variant="outline">
                {hero.secondaryCta}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
