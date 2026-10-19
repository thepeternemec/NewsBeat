"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "See a live response", shown as a response instead of as raw JSON in a tab.
 *
 * The button used to open `/api/v2/topics?limit=5` in a new tab, which is the
 * browser's unstyled JSON viewer: a wall of `beat_id`s and counts, out of the site's
 * design, and — worse for the purpose — not the thing anyone wants to see. What a
 * reader is trying to find out is *what does my agent actually get back?*
 *
 * So this fetches `/v2/brief` for NVIDIA on hover and renders the response in the
 * page's own code style, with the headlines legible. Nothing is fetched until the
 * reader reaches for it, so the page costs one request only when asked.
 */

const TOPIC = "b_bb964843350e"; // NVIDIA — a ticker anybody recognises

interface Brief {
  beat_id: string;
  ticker: string;
  label: string;
  count: number;
  freshness: { status: string };
  items: Array<{ lede: string; source: string; published_at: string }>;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: Brief; ms: number }
  | { status: "error"; message: string };

export default function LiveResponse() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    setState((current) =>
      current.status === "idle" || current.status === "error" ? { status: "loading" } : current,
    );
    const started = performance.now();
    try {
      const response = await fetch(`/api/v2/brief?beat_id=${TOPIC}`, {
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as Brief;
      setState({ status: "ready", data, ms: Math.round(performance.now() - started) });
    } catch (error) {
      setState({ status: "error", message: (error as Error).message });
    }
  }, []);

  const show = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
    void load();
  }, [load]);

  /** A short delay so moving the pointer into the panel does not dismiss it. */
  const hide = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <span className="live-response" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        className="btn-ghost live-response-button"
        aria-expanded={open}
        aria-controls="live-response-panel"
        onFocus={show}
        onClick={() => (open ? setOpen(false) : show())}
      >
        See a live response
      </button>

      {open && (
        <div
          id="live-response-panel"
          className="live-response-panel"
          role="dialog"
          aria-label="A live response from the brief endpoint"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="code live-response-code">
            <div className="code-bar">
              <span>GET /api/v2/brief</span>
              <span className="live-response-status">
                {state.status === "ready"
                  ? `200 · ${state.ms} ms`
                  : state.status === "loading"
                    ? "fetching…"
                    : state.status === "error"
                      ? state.message
                      : "live"}
              </span>
            </div>

            {state.status === "ready" ? (
              <pre>
                <span className="c-dim">{"{"}</span>
                {"\n  "}
                <span className="c-key">&quot;ticker&quot;</span>
                {": "}
                <span className="c-str">&quot;{state.data.ticker}&quot;</span>
                {",\n  "}
                <span className="c-key">&quot;label&quot;</span>
                {": "}
                <span className="c-str">&quot;{state.data.label}&quot;</span>
                {",\n  "}
                <span className="c-key">&quot;count&quot;</span>
                {": "}
                <span className="c-str">{state.data.count}</span>
                {",\n  "}
                <span className="c-key">&quot;items&quot;</span>
                {": [\n"}
                {/* Two is enough to show the shape; a third makes the panel scroll. */}
                {state.data.items.slice(0, 2).map((item, index) => (
                  <span key={index}>
                    {"    "}
                    <span className="c-dim">{"{"}</span>
                    {"\n      "}
                    <span className="c-key">&quot;lede&quot;</span>
                    {": "}
                    <span className="c-str live-response-lede">&quot;{item.lede}&quot;</span>
                    {",\n      "}
                    <span className="c-key">&quot;source&quot;</span>
                    {": "}
                    <span className="c-str">&quot;{item.source}&quot;</span>
                    {",\n      "}
                    <span className="c-key">&quot;published_at&quot;</span>
                    {": "}
                    <span className="c-str">
                      &quot;{item.published_at.slice(11, 16)}Z&quot;
                    </span>
                    {"\n    "}
                    <span className="c-dim">{"}"}</span>
                    {index === 0 ? "," : ""}
                    {"\n"}
                  </span>
                ))}
                {"  ],\n  "}
                <span className="c-key">&quot;cursor&quot;</span>
                {": "}
                <span className="c-dim">&quot;eyJ2IjoxLC…&quot;</span>
                {"\n"}
                <span className="c-dim">{"}"}</span>
              </pre>
            ) : (
              <pre className="live-response-skeleton">
                {state.status === "error"
                  ? "could not reach the API — try again"
                  : "fetching a real response…"}
              </pre>
            )}
          </div>

          <p className="live-response-foot">
            A real response, fetched just now. Every item carries the publisher&rsquo;s headline, the
            source and a link that resolves to the article — and the <code>cursor</code> that makes
            the next call cheaper.{" "}
            <a href={`/api/v2/brief?beat_id=${TOPIC}`} target="_blank" rel="noreferrer">
              the raw JSON
            </a>
          </p>
        </div>
      )}
    </span>
  );
}
