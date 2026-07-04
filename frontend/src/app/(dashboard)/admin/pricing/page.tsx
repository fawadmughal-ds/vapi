"use client";

import { AdminPricingPanel } from "@/components/dashboard/admin-pricing-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";

export default function AdminPricingPage() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (user?.role !== "super_admin") {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          You don&apos;t have access to pricing settings.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Plans"
        description="Manage subscription tiers shown on the marketing site and tenant billing."
      />
      <AdminPricingPanel />
    </div>
  );
}
