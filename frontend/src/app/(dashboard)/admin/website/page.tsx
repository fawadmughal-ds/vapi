"use client";

import { AdminWebsitePanel } from "@/components/dashboard/admin-website-panel";
import { Card, CardContent } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";

export default function AdminWebsitePage() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (user?.role !== "super_admin") {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          You don&apos;t have access to website management.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AdminWebsitePanel />
    </div>
  );
}
