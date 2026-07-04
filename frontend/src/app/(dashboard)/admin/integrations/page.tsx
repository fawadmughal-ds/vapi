"use client";

import { IntegrationsPanel } from "@/components/dashboard/integrations-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";

export default function AdminIntegrationsPage() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (user?.role !== "super_admin") {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          You don&apos;t have access to integrations.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect voice, model, and data providers for the whole platform. Customers use these automatically — they never manage keys themselves."
      />
      <IntegrationsPanel />
    </div>
  );
}
