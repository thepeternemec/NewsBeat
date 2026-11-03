"use client";
import { useEffect, useRef, useState } from "react";
import { Activity, RefreshCw, Rss } from "lucide-react";
import type {
  ComponentId,
  OperationState,
  OperationSnapshot,
  OperationStatus,
} from "@newsbeat/contracts";
import { API_BASE } from "./content";
import { timelineSlots, indexHistory, historyStats } from "./status-history";

const LABELS: Record<OperationState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Unavailable",
  unknown: "Unknown",
};
const TITLES: Record<OperationState, string> = {
  operational: "All monitored systems operational.",
  degraded: "Some services need attention.",
  outage: "Monitored services are unavailable.",
  unknown: "Status is currently unknown.",
};
const COMPONENTS = [
  { id: "api", name: "News API", kind: "REST", endpoint: "GET /api/v2/news", method: "News read + cursor validation", scope: "Checks a real NVIDIA news response, its freshness field and follow-up cursor." },
  { id: "mcp", name: "Agent connection", kind: "MCP", endpoint: "POST /api/mcp", method: "Initialize + newsbeat_brief", scope: "Checks protocol initialization, then calls the news briefing tool." },
  { id: "ingestion", name: "News collection", kind: "INGESTION", endpoint: "/api/cron/ingest", method: "Catalog-wide freshness", scope: "Reads collection records for every supported topic against its own freshness window. Collection is scheduled every 15 minutes." },
] as const;
function stamp(value: string, precise = false, zone: DisplayZone = "utc") {
  return (
    new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: precise ? "2-digit" : undefined,
      timeZone: zone === "utc" ? "UTC" : undefined,
      timeZoneName: "short",
    })
  );
}
function Badge({ state }: { state: OperationState }) {
  return (
    <span className={`status-badge state-${state}`}>
      <i aria-hidden="true" />
      {LABELS[state]}
    </span>
  );
}

type TimelineSelection = { slot: number; source: "hover" | "focus" | "tap"; anchor: number };
type HistoryHours = 4 | 12 | 24;
type DisplayZone = "local" | "utc";

function ServiceTimeline({
  component,
  slots,
  reports,
  hours,
  zone,
}: {
  hours: HistoryHours;
  zone: DisplayZone;
  component: { id: ComponentId; name: string };
  slots: number[];
  reports: Map<number, OperationSnapshot>;
}) {
  const [selection, setSelection] = useState<TimelineSelection | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const chart = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const anchorFor = (button: HTMLButtonElement) => {
    const bounds = chart.current?.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    return bounds?.width ? Math.max(0, Math.min(100, (target.left + target.width / 2 - bounds.left) / bounds.width * 100)) : 50;
  };
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [slots.length]);
  const dismissTimer = useRef<number | null>(null);
  const tooltipId = "status-check-" + component.id;
  const clearDismiss = () => {
    if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
  };

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !chart.current?.contains(event.target)) {
        setSelection(null);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    };
  }, []);

  const active = selection && slots.includes(selection.slot) ? selection : null;
  const report = active ? reports.get(active.slot) : undefined;
  const result = report?.components.find((item) => item.id === component.id);
  const observed = result?.status ?? "unknown";
  const cursorSlot = cursor !== null && slots.includes(cursor) ? cursor : slots.at(-1);
  const stats = historyStats(component.id, slots, reports);
  const position = active?.anchor ?? 50;

  return (
    <div className="status-service-timeline">
      <div
        className="status-chart"
        ref={chart}
        onPointerEnter={clearDismiss}
        onPointerLeave={() => {
          clearDismiss();
          dismissTimer.current = window.setTimeout(() => {
            setSelection((previous) => previous?.source === "hover" ? null : previous);
          }, 180);
        }}
      >
        <div className="status-bars-scroll" ref={scroller} onScroll={() => {
          setSelection(previous => {
            if (!previous) return null;
            const button = chart.current?.querySelector<HTMLButtonElement>('[data-slot="' + previous.slot + '"]');
            return button ? { ...previous, anchor: anchorFor(button) } : null;
          });
        }}>
        <div className="status-bars" style={{ gridTemplateColumns: "repeat(" + (slots.length || hours * 12) + ", minmax(0, 1fr))", minWidth: (slots.length || hours * 12) * 3 }} role="group" aria-label={component.name + " check history"}>
          {slots.length ? slots.map((slot, index) => {
            const snapshot = reports.get(slot);
            const check = snapshot?.components.find((item) => item.id === component.id);
            const state = check?.status ?? "unknown";
            const time = snapshot?.checked_at ?? new Date(slot).toISOString();
            return (
              <button
                key={slot}
                type="button"
                className={"status-check-bar state-" + state}
                data-slot={slot}
                data-state={state}
                data-checked-at={check ? snapshot!.checked_at : undefined}
                data-active={active?.slot === slot || undefined}
                tabIndex={slot === cursorSlot ? 0 : -1}
                aria-label={component.name + ", " + stamp(time, Boolean(check), zone) + ": " + (check ? LABELS[state] : "No recorded check")}
                aria-describedby={active?.slot === slot ? tooltipId : undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") {
                    clearDismiss();
                    setSelection({ slot, source: "hover", anchor: anchorFor(event.currentTarget) });
                  }
                }}
                onFocus={(event) => {
                  setCursor(slot);
                  setSelection({ slot, source: "focus", anchor: anchorFor(event.currentTarget) });
                }}
                onBlur={() => setSelection((previous) =>
                  previous?.slot === slot && previous.source === "focus" ? null : previous,
                )}
                onClick={(event) => {
                  const anchor = anchorFor(event.currentTarget);
                  setSelection(previous => previous?.slot === slot && previous.source === "tap" ? null : { slot, source: "tap", anchor });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSelection(null);
                    return;
                  }
                  const next = event.key === "ArrowLeft" ? Math.max(0, index - 1)
                    : event.key === "ArrowRight" ? Math.min(slots.length - 1, index + 1)
                    : event.key === "Home" ? 0
                    : event.key === "End" ? slots.length - 1 : null;
                  if (next !== null) {
                    event.preventDefault();
                    chart.current?.querySelector<HTMLButtonElement>('[data-slot="' + slots[next] + '"]')?.focus();
                  }
                }}
              />
            );
          }) : Array.from({ length: hours * 12 }, (_, index) => (
            <span key={index} className="status-check-placeholder" aria-hidden="true" />
          ))}
        </div>
        </div>
        {active ? (
          <div
            id={tooltipId}
            role="tooltip"
            className={"status-check-tooltip state-" + observed}
            style={{ left: "clamp(min(140px, 50%), " + position + "%, max(50%, calc(100% - 140px)))" }}
            onPointerEnter={clearDismiss}
          >
            <div className="status-tooltip-top">
              <span>{component.name}</span>
              <Badge state={observed} />
            </div>
            <span className="status-tooltip-caption">{result ? "Checked" : "Five-minute window starting"}</span>
            <time dateTime={result ? report!.checked_at : new Date(active.slot).toISOString()}>
              {stamp(result ? report!.checked_at : new Date(active.slot).toISOString(), Boolean(result), zone)}
            </time>
            <p>{result?.detail ?? "No check was recorded for this service in this window."}</p>
            {result?.latency_ms != null ? (
              <span className="status-tooltip-metric">Completed in {(result.latency_ms / 1000).toFixed(2)}s</span>
            ) : result?.coverage ? (
              <span className="status-tooltip-metric">
                {result.coverage.fresh.toLocaleString()} / {result.coverage.total.toLocaleString()} topics fresh
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="status-timeline-axis">
        <span>{hours} hours ago</span>
        <span>{slots.length ? stats.recorded + " / " + slots.length + " recorded" : "Loading checks…"}</span>
        <span>Latest</span>
      </div>
    </div>
  );
}

export default function StatusBoard() {
  const [data, setData] = useState<OperationStatus | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(0);
  const [hours, setHours] = useState<HistoryHours>(24);
  const [zone, setZone] = useState<DisplayZone>("local");
  const timeZone = now && zone === "local" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    let sequence = 0;
    const refresh = async () => {
      controller?.abort();
      const currentSequence = ++sequence;
      const thisController = new AbortController();
      controller = thisController;
      const timeout = window.setTimeout(() => thisController.abort(), 12_000);
      if (active) setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/status`, {
          signal: thisController.signal,
          cache: "no-store",
        });
        const next = (await response.json()) as OperationStatus;
        if (
          !Array.isArray(next.history) ||
          !Object.hasOwn(TITLES, next.status) ||
          (next.latest !== null &&
            (!next.latest ||
              typeof next.latest !== "object" ||
              !Array.isArray(next.latest.components))) ||
          next.history.some(
            (report) =>
              !report ||
              typeof report !== "object" ||
              !Array.isArray(report.components),
          ) ||
          !next.generated_at ||
          !["current", "delayed", "starting", "unavailable"].includes(
            next.monitoring,
          )
        )
          throw new Error("Invalid status response");
        if (active && sequence === currentSequence) {
          setData(next);
          setError(false);
          setNow(Date.now());
        }
      } catch {
        if (active && sequence === currentSequence) {
          setError(true);
          setNow(Date.now());
        }
      } finally {
        window.clearTimeout(timeout);
        if (active && sequence === currentSequence) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (!document.hidden) void refresh();
    }, 60_000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [attempt]);

  const age = data?.latest
    ? now - Date.parse(data.latest.checked_at)
    : Infinity;
  const current =
    !error &&
    data?.monitoring === "current" &&
    age <= 12 * 60_000 &&
    age >= -60_000;
  const state: OperationState = current ? data!.status : "unknown";
  const message = error
    ? "The status feed could not be reached. Previous results below are historical."
    : data?.monitoring === "starting"
      ? "The monitor is starting. Its first recorded check will appear here."
      : data?.monitoring === "unavailable"
        ? "Check history is temporarily unavailable."
        : !current && data?.latest
          ? "The last recorded check is out of date or cannot be verified. Current availability is unknown."
          : "Scheduled every 5 minutes · This page refreshes every minute.";
  const history = data?.history ?? [];
  const recentSlots = timelineSlots(now, hours);
  const bySlot = indexHistory(history);

  return (
    <>
      <section
        className={`status-overview state-${state}`}
        aria-labelledby="status-current-title"
      >
        <div className="status-overview-icon">
          <Activity size={26} strokeWidth={1.5} />
        </div>
        <div>
          <span className="status-kicker">Current status</span>
          <h2 id="status-current-title" role="status">
            {!data && loading ? "Loading service checks…" : TITLES[state]}
          </h2>
          <p>
            {!data && loading ? "Reading the latest recorded checks." : message}
          </p>
        </div>
        <button
          type="button"
          className="status-refresh"
          disabled={loading}
          onClick={() => setAttempt((a) => a + 1)}
        >
          <RefreshCw size={14} className={loading ? "status-spinning" : ""} />
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </section>
      <div className="status-meta">
        <span>
          {data?.latest ? (
            <>
              Last check{" "}
              <time dateTime={data.latest.checked_at}>
                {stamp(data.latest.checked_at, true, zone)}
              </time>
            </>
          ) : (
            "Awaiting a recorded check"
          )}
        </span>
        <a href="/api/status/feed">
          <Rss size={13} /> Atom feed
        </a>
      </div>

      <div className="status-monitor-facts" aria-label="Monitor information"><span><strong>3</strong> monitored services</span><span><strong>5 min</strong> check interval</span><span><strong>{hours * 12}</strong> bars per service</span><span title="The monitor calls the production newsbeat.dev service">Production monitor</span></div>

      <section className="status-services" aria-labelledby="status-services-title">
        <div className="status-section-heading">
          <div>
            <span className="status-kicker">Recorded availability</span>
            <h2 id="status-services-title">Service history</h2>
          </div>
          <div className="status-window-controls" role="group" aria-label="History time range">{([4, 12, 24] as const).map(value => <button key={value} type="button" aria-pressed={hours === value} onClick={() => setHours(value)}>{value}h</button>)}</div>
        </div>
        <div className="status-toolbar"><span>Each bar = 5 minutes · Hover, focus or tap</span><label>Time zone <select value={zone} onChange={event => setZone(event.target.value as DisplayZone)}><option value="local">Local time</option><option value="utc">UTC</option></select><span>{timeZone}</span></label></div>
        <div className="status-components">
          {COMPONENTS.map((component) => {
            const result = data?.latest?.components.find((item) => item.id === component.id);
            const observed: OperationState = current && result ? result.status : "unknown";
            const stats = historyStats(component.id, recentSlots, bySlot);
            return (
              <article className="status-component" key={component.id} aria-label={component.name}>
                <div className="status-component-top">
                  <div className="status-service-identity"><h3>{component.name}</h3><span className="status-service-kind">{component.kind}</span><code>ID: {component.id}</code></div>
                  <Badge state={observed} />
                </div>
                <div className="status-service-endpoint"><code>{component.endpoint}</code><span>{component.method}</span></div>
                <p>{result?.detail ?? "No check result is available yet."}</p>
                <ServiceTimeline component={component} slots={recentSlots} reports={bySlot} hours={hours} zone={zone} />
                <div className="status-service-meta">
                  <span><strong>{stats.healthyPercent === null ? "—" : stats.healthyPercent.toFixed(1) + "%"}</strong> healthy observed checks</span>
                  {result?.coverage ? (
                    <>
                      <span><strong>{result.coverage.fresh.toLocaleString()}</strong> fresh topics</span>
                      <span><strong>{result.coverage.stale.toLocaleString()}</strong> delayed</span>
                      <span><strong>{result.coverage.unavailable.toLocaleString()}</strong> unchecked</span>
                      {result.coverage.failed_last_check > 0 ? (
                        <span><strong>{result.coverage.failed_last_check}</strong> failed their last collection attempt</span>
                      ) : null}
                    </>
                  ) : (
                    <span>Probe duration <strong>{result?.latency_ms != null ? (result.latency_ms / 1000).toFixed(2) + "s" : "—"}</strong></span>
                  )}
                  {!current && result ? <span>Historical result · {stamp(data!.latest!.checked_at, true, zone)}</span> : null}
                </div>
                <details className="status-service-details"><summary>Service details</summary><p>{component.scope}</p><dl><div><dt>Service ID</dt><dd><code>{component.id}</code></dd></div><div><dt>Check method</dt><dd>{component.method}</dd></div><div><dt>Last observation</dt><dd>{data?.latest ? stamp(data.latest.checked_at, true, zone) : "Not recorded"}</dd></div><div><dt>Recorded windows</dt><dd>{stats.recorded} of {recentSlots.length || hours * 12}</dd></div><div><dt>Degraded / unavailable</dt><dd>{stats.counts.degraded} / {stats.counts.outage}</dd></div><div><dt>Unknown windows</dt><dd>{stats.counts.unknown}</dd></div></dl></details>
              </article>
            );
          })}
        </div>
        <div className="status-legend" aria-label="Check status legend">
          <span><i className="state-operational" /> Operational</span>
          <span><i className="state-degraded" /> Degraded</span>
          <span><i className="state-outage" /> Unavailable</span>
          <span><i className="state-unknown" /> No check / unknown</span>
        </div>
        {!history.length && !loading ? (
          <div className="status-empty">
            <h3>{error ? "Check history could not load." : "History starts with the first check."}</h3>
            <p>Bars fill as real checks are recorded. Missing checks do not establish service availability.</p>
          </div>
        ) : null}
        <p className="status-history-note">Times shown in {timeZone}. Healthy percentages use observed checks only; missing windows stay unknown. On narrow screens, scroll the bars horizontally. Use the arrow keys to move between checks and Escape to close their details.</p>
      </section>
    </>
  );
}
