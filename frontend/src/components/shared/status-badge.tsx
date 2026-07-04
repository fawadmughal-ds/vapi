import { Badge, type BadgeProps } from "@/components/ui/badge";

const MAP: Record<string, BadgeProps["variant"]> = {
  // calls
  completed: "success",
  in_progress: "default",
  ringing: "default",
  queued: "secondary",
  failed: "destructive",
  no_answer: "warning",
  busy: "warning",
  // agents
  published: "success",
  draft: "secondary",
  disabled: "destructive",
  // orders
  confirmed: "default",
  fulfilled: "success",
  pending: "warning",
  canceled: "destructive",
  // subscription / account
  active: "success",
  trialing: "default",
  past_due: "warning",
  inactive: "secondary",
  suspended: "destructive",
  // phone numbers
  assigned: "success",
  available: "secondary",
  released: "destructive",
  // documents
  ready: "success",
  processing: "warning",
  uploading: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = MAP[status] ?? "secondary";
  const label = status.replace(/_/g, " ");
  return <Badge variant={variant} className="capitalize">{label}</Badge>;
}
