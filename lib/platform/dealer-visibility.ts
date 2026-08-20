import { isFuture } from "date-fns";

/**
 * Down-tier risk copy (spec Section 14 golden-path script: "your dealer will
 * see this on [date]") needs to read correctly whether `dealerVisibleAt` is
 * still upcoming or has already passed relative to the real clock — a fixed
 * demo seed anchor (SEED_NOW) drifts into the past as real time goes by
 * between when `db:reset` last ran and when the demo is actually viewed.
 */
export function formatDealerVisibility(dealerVisibleAt: string): string {
  const date = new Date(dealerVisibleAt);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return isFuture(date) ? `Your dealer will see this on ${dateLabel}` : `Your dealer has seen this since ${dateLabel}`;
}
