import type { ComponentId, OperationSnapshot, OperationState } from "@newsbeat/contracts";

export const STATUS_INTERVAL_MS = 5 * 60_000;
export const STATUS_HISTORY_HOURS = 24;

export function timelineSlots(now: number, hours: number): number[] {
  if (!Number.isFinite(now) || now <= 0 || !Number.isFinite(hours) || hours <= 0 || hours > STATUS_HISTORY_HOURS) return [];
  const count = Math.floor(hours * 60 * 60_000 / STATUS_INTERVAL_MS);
  const latest = Math.floor(now / STATUS_INTERVAL_MS) * STATUS_INTERVAL_MS;
  return Array.from({ length: count }, (_, index) => latest - (count - 1 - index) * STATUS_INTERVAL_MS);
}

export function indexHistory(history: OperationSnapshot[]): Map<number, OperationSnapshot> {
  const reports = new Map<number, OperationSnapshot>();
  for (const report of history) {
    const time = Date.parse(report.checked_at);
    if (!Number.isFinite(time)) continue;
    const slot = Math.floor(time / STATUS_INTERVAL_MS) * STATUS_INTERVAL_MS;
    const previous = reports.get(slot);
    if (!previous || time > Date.parse(previous.checked_at)) reports.set(slot, report);
  }
  return reports;
}

export function historyStats(component: ComponentId, slots: number[], reports: Map<number, OperationSnapshot>) {
  const counts: Record<OperationState, number> = { operational: 0, degraded: 0, outage: 0, unknown: 0 };
  let recorded = 0;
  for (const slot of slots) {
    const check = reports.get(slot)?.components.find(item => item.id === component);
    if (check) recorded++;
    counts[check?.status ?? "unknown"]++;
  }
  const measured = counts.operational + counts.degraded + counts.outage;
  return { counts, recorded, measured, healthyPercent: measured ? counts.operational / measured * 100 : null };
}
