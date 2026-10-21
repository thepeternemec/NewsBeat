"use client";
import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, RefreshCw, Rss } from "lucide-react";
import type {
  ComponentId,
  OperationState,
  OperationStatus,
} from "@newsbeat/contracts";
import { API_BASE } from "./content";

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
  { id: "api", name: "News API" },
  { id: "mcp", name: "Agent connection (MCP)" },
  { id: "ingestion", name: "News collection" },
] as const;
function stamp(value: string) {
  return (
    new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
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

export default function StatusBoard() {
  const [data, setData] = useState<OperationStatus | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(0);
  const [filter, setFilter] = useState<ComponentId | "all">("all");
  const [expanded, setExpanded] = useState(false);
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
  const slotMs = 5 * 60_000;
  const recentSlots = !now
    ? []
    : Array.from(
        { length: 48 },
        (_, i) => Math.floor(now / slotMs) * slotMs - (47 - i) * slotMs,
      );
  const bySlot = new Map(
    history.map((report) => [
      Math.floor(Date.parse(report.checked_at) / slotMs) * slotMs,
      report,
    ]),
  );

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
                {stamp(data.latest.checked_at)}
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
      <section className="status-components" aria-label="Monitored services">
        {COMPONENTS.map((component) => {
          const result = data?.latest?.components.find(
            (c) => c.id === component.id,
          );
          const observed: OperationState =
            current && result ? result.status : "unknown";
          return (
            <article className="status-component" key={component.id}>
              <div className="status-component-top">
                <h2>{component.name}</h2>
                <Badge state={observed} />
              </div>
              <p>
                {result ? result.detail : "No check result is available yet."}
              </p>
              {result?.coverage ? (
                <>
                  <div className="status-coverage" aria-label="Topic coverage">
                    <span>
                      <strong>{result.coverage.fresh.toLocaleString()}</strong>{" "}
                      fresh
                    </span>
                    <span>
                      <strong>{result.coverage.stale.toLocaleString()}</strong>{" "}
                      delayed
                    </span>
                    <span>
                      <strong>
                        {result.coverage.unavailable.toLocaleString()}
                      </strong>{" "}
                      unchecked
                    </span>
                  </div>
                  <small>
                    {result.coverage.failed_last_check} topics failed their most
                    recent collection attempt.
                  </small>
                </>
              ) : (
                <div className="status-latency">
                  <span>Complete check</span>
                  <strong>
                    {result?.latency_ms != null
                      ? `${(result.latency_ms / 1000).toFixed(2)}s`
                      : "—"}
                  </strong>
                </div>
              )}
              {!current && result ? (
                <small>
                  Historical result · {stamp(data!.latest!.checked_at)}
                </small>
              ) : null}
            </article>
          );
        })}
      </section>
      <section
        className="status-history"
        aria-labelledby="status-history-title"
      >
        <div className="status-section-heading">
          <div>
            <span className="status-kicker">Recorded observations</span>
            <h2 id="status-history-title">The last four hours.</h2>
          </div>
          <span>Each bar represents a five-minute window</span>
        </div>
        <div className="status-bars" aria-label="Recent check results">
          {recentSlots.map((slot) => {
            const report = bySlot.get(slot);
            return (
              <span
                key={slot}
                className={`state-${report?.status ?? "unknown"}`}
                title={`${stamp(new Date(slot).toISOString())}: ${report ? LABELS[report.status] : "No recorded check"}`}
              />
            );
          })}
        </div>
        <div className="status-legend">
          <span>
            <i className="state-operational" /> Operational
          </span>
          <span>
            <i className="state-degraded" /> Degraded
          </span>
          <span>
            <i className="state-outage" /> Unavailable
          </span>
          <span>
            <i className="state-unknown" /> No check / unknown
          </span>
        </div>
      </section>
      <section className="status-feed" aria-labelledby="status-feed-title">
        <div className="status-section-heading">
          <div>
            <span className="status-kicker">Operation feed</span>
            <h2 id="status-feed-title">Recent checks.</h2>
          </div>
          <a href="/api/status">
            Read as JSON <ArrowUpRight size={13} />
          </a>
        </div>
        <div
          className="status-filters"
          role="group"
          aria-label="Filter check history"
        >
          {[{ id: "all", name: "All services" }, ...COMPONENTS].map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id as ComponentId | "all")}
            >
              {item.name}
            </button>
          ))}
        </div>
        {history.length ? (
          <ol>
            {history.slice(0, expanded ? 20 : 6).map((report) => {
              const component = report.components.find((c) => c.id === filter);
              const observed =
                filter === "all"
                  ? report.status
                  : (component?.status ?? "unknown");
              return (
                <li key={report.checked_at}>
                  <time dateTime={report.checked_at}>
                    {stamp(report.checked_at)}
                  </time>
                  <div>
                    <Badge state={observed} />
                    <p>
                      {filter === "all"
                        ? report.components
                            .map(
                              (c) =>
                                `${c.name}: ${LABELS[c.status].toLowerCase()}`,
                            )
                            .join(" · ")
                        : (component?.detail ??
                          "This component was not checked.")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="status-empty">
            <Activity size={22} />
            <h3>
              {error
                ? "Check history could not load."
                : "History starts with the first check."}
            </h3>
            <p>
              Only real observations appear here. Check back after the monitor’s
              next run.
            </p>
          </div>
        )}
        {history.length > 6 ? (
          <button
            className="status-refresh status-show-more"
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? "Show fewer checks"
              : `Show ${Math.min(history.length, 20) - 6} more checks`}
          </button>
        ) : null}
      </section>
    </>
  );
}
