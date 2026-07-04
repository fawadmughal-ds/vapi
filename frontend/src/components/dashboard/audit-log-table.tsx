"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog, Page } from "@/lib/types";

// Color hint per action category for quick scanning.
function actionVariant(action: string) {
  if (action.includes("delete") || action.includes("suspend")) return "destructive";
  if (action.includes("impersonate")) return "warning";
  if (action.includes("login") || action.includes("register")) return "secondary";
  return "default" as const;
}

export function AuditLogTable({
  path,
  pageSize = 25,
}: {
  path: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const sep = path.includes("?") ? "&" : "?";
    api
      .get<Page<AuditLog>>(`${path}${sep}page=${page}&page_size=${pageSize}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [path, page, pageSize]);

  if (loading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No activity yet"
        description="Actions will appear here as they happen."
        className="border-0"
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                <Badge variant={actionVariant(log.action)} className="font-mono text-[11px]">
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell>
                {log.actor_name ? (
                  <div>
                    <p className="text-sm font-medium">{log.actor_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.actor_email}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">System</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.resource_type ? (
                  <span className="font-mono text-xs">
                    {log.resource_type}
                    {log.resource_id ? `:${log.resource_id.slice(0, 8)}` : ""}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.ip_address || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(log.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.pages} · {data.total} entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
