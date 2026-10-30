import type {
  OperationComponent,
  OperationSnapshot,
  OperationState,
  OperationStatus,
} from "@blacksheep/contracts";

export const CHECK_INTERVAL_MINUTES = 5;
export const MONITOR_STALE_MS = 12 * 60_000;
/** Accept native JSON reports and the JSON-string rows from the initial rollout. */
export function decodeSnapshot(value: unknown): OperationSnapshot | null {
  try {
    const parsed = (
      typeof value === "string" ? JSON.parse(value) : value
    ) as OperationSnapshot | null;
    const states = ["operational", "degraded", "outage", "unknown"];
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.checked_at !== "string" ||
      !Number.isFinite(Date.parse(parsed.checked_at)) ||
      !states.includes(parsed.status) ||
      !Array.isArray(parsed.components) ||
      !parsed.components.length
    )
      return null;
    if (
      !parsed.components.every(
        (component) =>
          component &&
          ["api", "mcp", "ingestion"].includes(component.id) &&
          typeof component.name === "string" &&
          typeof component.detail === "string" &&
          states.includes(component.status),
      )
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}
export function overall(components: OperationComponent[]): OperationState {
  if (!components.length || components.some((c) => c.status === "unknown"))
    return "unknown";
  if (components.every((c) => c.status === "outage")) return "outage";
  return components.some((c) => c.status !== "operational")
    ? "degraded"
    : "operational";
}

export function statusDocument(
  history: OperationSnapshot[],
  now = Date.now(),
  available = true,
): OperationStatus {
  const latest = history[0] ?? null;
  const age = latest ? now - Date.parse(latest.checked_at) : NaN;
  const monitoring = !available
    ? "unavailable"
    : !latest
      ? "starting"
      : !Number.isFinite(age) || age < -60_000 || age > MONITOR_STALE_MS
        ? "delayed"
        : "current";
  return {
    generated_at: new Date(now).toISOString(),
    status: monitoring === "current" ? latest!.status : "unknown",
    monitoring,
    interval_minutes: CHECK_INTERVAL_MINUTES,
    latest,
    history: history.filter(
      (report) =>
        now - Date.parse(report.checked_at) <= 4 * 60 * 60_000 &&
        Date.parse(report.checked_at) <= now + 60_000,
    ),
  };
}

export function ingestionComponent(
  targets: ReadonlyArray<{ beat_id: string; freshness_slo_minutes: number }>,
  rows: Array<{
    beat_id: string;
    last_success_at: string | Date | null;
    last_checked_at: string | Date | null;
  }>,
  now = Date.now(),
): OperationComponent {
  const byId = new Map(rows.map((row) => [row.beat_id, row]));
  let fresh = 0,
    stale = 0,
    unavailable = 0,
    failed = 0,
    last = 0;
  for (const target of targets) {
    const row = byId.get(target.beat_id);
    const success = row?.last_success_at
      ? new Date(row.last_success_at).getTime()
      : NaN;
    const checked = row?.last_checked_at
      ? new Date(row.last_checked_at).getTime()
      : NaN;
    if (!Number.isFinite(success) || success > now + 60_000) unavailable++;
    else {
      last = Math.max(last, success);
      if (now - success <= target.freshness_slo_minutes * 60_000) fresh++;
      else stale++;
    }
    if (
      Number.isFinite(checked) &&
      (!Number.isFinite(success) || checked > success + 1000)
    )
      failed++;
  }
  return {
    id: "ingestion",
    name: "News collection",
    status: !targets.length
      ? "unknown"
      : !fresh
        ? "outage"
        : stale || unavailable || failed
          ? "degraded"
          : "operational",
    detail: `${fresh.toLocaleString("en-US")} of ${targets.length.toLocaleString("en-US")} topics have a successful check within their refresh window.`,
    coverage: {
      total: targets.length,
      fresh,
      stale,
      unavailable,
      failed_last_check: failed,
      last_success_at: last ? new Date(last).toISOString() : null,
    },
  };
}

const xml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function atomFeed(document: OperationStatus): string {
  const entries = document.history
    .map(
      (report) =>
        `<entry><id>urn:blacksheep:check:${xml(report.checked_at)}</id><title>${xml(`Black Sheep check: ${report.status}`)}</title><updated>${xml(report.checked_at)}</updated><link href="https://blacksheep.vercel.app/status"/><summary>${xml(report.components.map((c) => `${c.name}: ${c.status}. ${c.detail}`).join(" "))}</summary></entry>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>https://blacksheep.vercel.app/status</id><title>Black Sheep operational checks</title><subtitle>Five-minute checks. Missing checks do not establish service availability.</subtitle><link href="https://blacksheep.vercel.app/api/status/feed" rel="self"/><link href="https://blacksheep.vercel.app/status"/><updated>${xml(document.latest?.checked_at ?? document.generated_at)}</updated>${entries}</feed>`;
}
