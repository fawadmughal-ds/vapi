"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Order, OrderStatus, Page } from "@/lib/types";

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "fulfilled",
  "canceled",
];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Order> | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<Page<Order>>(`/orders?page=${page}&page_size=15`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  async function updateStatus(id: string, status: OrderStatus) {
    try {
      await api.patch(`/orders/${id}`, { status });
      toast.success("Order updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Orders and leads created by your agents in real time."
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No orders yet"
              description="When an agent places an order during a call, it shows up here."
              className="border-0"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      {o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {o.customer_name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.phone || "—"}
                    </TableCell>
                    <TableCell>{o.product || "—"}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onChange={(e) =>
                          updateStatus(o.id, e.target.value as OrderStatus)
                        }
                        className="h-8 w-32"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(o.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.pages > 1 && (
        <div className="flex justify-end gap-2">
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
      )}
    </div>
  );
}
