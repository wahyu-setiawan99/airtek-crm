import { jakartaStart } from "@/lib/format";
import type { Activity, Deal, Stage } from "@/types/crm";

export function dealProbability(deal: Pick<Deal, "probability_override">, stage: Pick<Stage, "probability">) {
  return deal.probability_override ?? stage.probability;
}

export function weightedValue(
  deal: Pick<Deal, "value" | "probability_override">,
  stage: Pick<Stage, "probability">,
) {
  return (Number(deal.value) * dealProbability(deal, stage)) / 100;
}

export function isRotting(
  deal: Pick<Deal, "status" | "last_activity_at" | "created_at">,
  stage: Pick<Stage, "type" | "rotting_days">,
  now = new Date(),
) {
  if (stage.type !== "open" || deal.status !== "open" || !stage.rotting_days) return false;
  const last = new Date(deal.last_activity_at ?? deal.created_at).getTime();
  const days = (now.getTime() - last) / 86_400_000;
  return days > stage.rotting_days;
}

export function activitySignal(activities: Activity[], dealId: string): "scheduled" | "overdue" | "none" {
  const open = activities.filter((activity) => activity.deal_id === dealId && !activity.done_at);
  if (open.length === 0) return "none";
  const start = jakartaStart(0);
  if (open.some((activity) => new Date(activity.due_at).getTime() < start)) return "overdue";
  return "scheduled";
}

export function subtotal(qty: number, unitPrice: number, discountPct: number) {
  return Math.round(qty * unitPrice * (1 - discountPct / 100) * 100) / 100;
}
