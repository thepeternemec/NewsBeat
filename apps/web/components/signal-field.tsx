"use client";

import Antigravity from "@/components/antigravity";
import { hhmm } from "@/components/site/content";

/** Under an hour old. Marked, so "fresh" is visible without reading the clock. */
function isFresh(iso: string): boolean {
  const t = Date.parse(iso);
  return Number.isFinite(t) && Date.now() - t < 3600_000;
}

export interface SignalItem {
  beat_label: string;
  lede: string;
  source: string;
  url: string;
  /** ISO timestamp. Rendered as UTC so freshness is comparable at a glance. */
  published_at?: string;
  corroboration?: number;
}

/** Keep the visual bounded while the complete feed remains below it. */
const DISPLAY_LIMIT = 8;

export default function SignalField({ items }: { items: SignalItem[] }) {
  const shown = items.slice(0, DISPLAY_LIMIT);

  return (
    <div className="signal-field">
      <div className="signal-canvas">
        <Antigravity
          count={320}
          magnetRadius={8}
          ringRadius={7}
          waveSpeed={0.4}
          waveAmplitude={0.8}
          particleSize={1.6}
          lerpSpeed={0.05}
          color="#ededE8"
          autoAnimate
          particleVariance={0.7}
          pulseSpeed={3}
          particleShape="capsule"
          fieldStrength={10}
        />
      </div>

      <div className="signal-labels">
        {shown.map((item, i) => (
          <a
            key={i}
            className="signal-label"
            href={item.url}
            target="_blank"
            rel="noreferrer"
            style={{
              animationDelay: `${i * 110}ms`,
            }}
            title={`${item.source}${item.published_at ? ` · ${item.published_at}` : ""}`}
          >
            <span className="tag">{item.beat_label}</span>
            <span className="headline">{item.lede}</span>
            <span className="meta">
              <span className="src-name">
                {item.corroboration ? `◈${item.corroboration} · ` : ""}
                {item.source}
              </span>
              {item.published_at ? (
                <span className={`stamp${isFresh(item.published_at) ? " is-fresh" : ""}`}>
                  {hhmm(item.published_at)}
                </span>
              ) : null}
            </span>
          </a>
        ))}
        {shown.length === 0 && (
          <span className="signal-empty">awaiting signals — ingestion paused</span>
        )}
      </div>
    </div>
  );
}
