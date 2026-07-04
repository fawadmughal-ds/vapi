"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  BarChart3,
  BookOpen,
  Bot,
  CreditCard,
  Globe,
  LayoutDashboard,
  PhoneCall,
  Phone,
  Plug,
  ScrollText,
  Megaphone,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  Users2,
  Wrench,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { PlanBadge } from "@/components/saas/plan-badge";
import { SetupChecklistSidebar } from "@/components/saas/setup-checklist";
import { WorkspaceSwitcher } from "@/components/saas/workspace-switcher";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { cn, formatNumber } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Bot; badge?: string };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Home", icon: LayoutDashboard }],
  },
  {
    label: "Voice AI",
    items: [
      { href: "/agents", label: "AI Agents", icon: Bot },
      { href: "/squads", label: "Squads", icon: Users2 },
      { href: "/tools", label: "Tools", icon: Wrench },
      { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
    ],
  },
  {
    label: "Telephony",
    items: [
      { href: "/phone-numbers", label: "Phone Numbers", icon: Phone },
      { href: "/calls", label: "Call Logs", icon: PhoneCall },
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/providers", label: "Providers", icon: Plug },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/billing", label: "Billing & Usage", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ADMIN_MANAGE = [
  { tab: "customers", label: "Customers", icon: Users },
  { tab: "agents", label: "AI Agents", icon: Bot },
  { tab: "squads", label: "Squads", icon: Users2 },
  { tab: "tools", label: "Tools", icon: Wrench },
  { tab: "calls", label: "Calls", icon: PhoneCall },
  { tab: "numbers", label: "Phone Numbers", icon: Phone },
  { tab: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { tab: "analytics", label: "Analytics", icon: BarChart3 },
  { tab: "logs", label: "System Logs", icon: ScrollText },
];

const ADMIN_PLATFORM = [
  { href: "/admin/website", label: "Website & Pricing", icon: Globe },
  { href: "/admin/pricing", label: "Legacy Plans", icon: Tag },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Bot;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("nav-item", active ? "nav-item-active" : "nav-item-inactive")}
    >
      <Icon className="size-[15px] shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin";

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-border/60 bg-card/30 backdrop-blur-xl">
      <div className="flex h-14 shrink-0 items-center border-b border-border/50 px-4">
        <Link href={isAdmin ? "/admin" : "/dashboard"}>
          <Logo />
        </Link>
      </div>

      {!isAdmin && (
        <div className="border-b border-border/50 p-3">
          <WorkspaceSwitcher compact />
        </div>
      )}

      <Suspense fallback={<nav className="flex-1 px-2 py-3" />}>
        <SidebarNav onNavigate={onNavigate} />
      </Suspense>

      {!isAdmin && user && (
        <SidebarFooter verified={user.is_email_verified} />
      )}
    </aside>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin";

  if (isAdmin) {
    const onAdminHome = pathname === "/admin";
    const currentTab = searchParams.get("tab") || "customers";

    return (
      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        <div className="space-y-0.5">
          <p className="section-label">Manage</p>
          {ADMIN_MANAGE.map((item) => {
            const href =
              item.tab === "customers" ? "/admin" : `/admin?tab=${item.tab}`;
            const active = onAdminHome && currentTab === item.tab;
            return (
              <NavLink
                key={item.tab}
                href={href}
                label={item.label}
                icon={item.icon}
                active={active}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
        <div className="space-y-0.5">
          <p className="section-label">Platform</p>
          {ADMIN_PLATFORM.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-0.5">
          <p className="section-label">{group.label}</p>
          {group.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ))}
      <div className="space-y-0.5">
        <p className="section-label">Account</p>
        <NavLink
          href="/settings"
          label="Settings"
          icon={Settings}
          active={pathname.startsWith("/settings")}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
}

function SidebarFooter({ verified }: { verified: boolean }) {
  const { subscription: sub } = useSubscription();

  return (
    <div className="shrink-0 border-t border-border/50 p-3">
      <SetupChecklistSidebar verified={verified} />
      {sub && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <PlanBadge plan={sub.plan} status={sub.status} />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatNumber(Math.round(sub.credits_remaining))} cr left
            </span>
          </div>
          <Link
            href="/billing"
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Manage plan & usage →
          </Link>
        </div>
      )}
    </div>
  );
}
