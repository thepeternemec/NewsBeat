"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const CHECKS = [
  { label: "The move", title: "A rising market can lift everything.", text: "Compare the asset with its market baseline. The useful question is whether it is moving differently—not simply whether its price went up.", note: "Relative movement gives the agent a better question.", caption: "Compare the move. Separate the asset’s behavior from the wider market." },
  { label: "The support", title: "A move needs more than a headline.", text: "Look at participation, available liquidity and trading costs. A thin or costly market can make an apparent move less useful to investigate.", note: "Support is checked separately from the news hypothesis.", caption: "Look for support. Price, participation and trading conditions can tell different stories." },
  { label: "The timing", title: "The same story can mean something different later.", text: "A move may be developing, already extended or fading. Freshness and confirmation help the agent decide whether to review the signal, wait or reassess it.", note: "Missing or stale evidence can keep a review on hold.", caption: "Read the timing. A reason to investigate can become a reason to wait." },
] as const;

/** A labelled illustration of the existing pilot's checks, never a price forecast. */
export default function LandingTiming() {
  const [stage, setStage] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1000px)");
    let observer: IntersectionObserver | undefined;
    const sync = () => {
      observer?.disconnect();
      if (!desktop.matches) return;
      observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting);
        if (!visible.length) return;
        const target = visible.sort((a, b) => Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - window.innerHeight / 2) - Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - window.innerHeight / 2))[0].target as HTMLElement;
        setStage(Number(target.dataset.timingStep));
      }, { rootMargin: "-30% 0px -30% 0px", threshold: 0 });
      root.current?.querySelectorAll("[data-timing-step]").forEach(step => observer?.observe(step));
    };
    sync();
    desktop.addEventListener("change", sync);
    return () => { observer?.disconnect(); desktop.removeEventListener("change", sync); };
  }, []);

  return <div className="home-timing-grid" ref={root}>
    <figure className="home-timing-visual" data-stage={stage} aria-labelledby="timing-figure-title">
      <div className="timing-visual-heading"><span id="timing-figure-title">THE MARKET PICTURE</span><span>Illustration</span></div>
      <div className="timing-graph" aria-hidden="true">
        <svg viewBox="0 0 600 340" preserveAspectRatio="xMidYMid meet">
          <path className="timing-grid" d="M35 65H565 M35 130H565 M35 195H565 M35 260H565" />
          <rect className="timing-window" x="370" y="35" width="118" height="245" rx="8" />
          <path className="timing-baseline" d="M35 249C85 248 98 218 145 226S210 190 265 200S331 168 380 176S448 148 490 155S536 130 565 138" />
          <path className="timing-asset" pathLength="100" d="M35 252C80 248 105 220 145 229S207 188 265 195S328 144 380 154S433 72 475 95S530 56 565 63" />
          <g className="timing-participation">{[13, 18, 11, 22, 17, 24, 19, 32, 27, 43, 51, 44, 58, 49, 62, 52].map((height, index) => <rect key={index} x={44 + index * 32} y={326 - height * .6} width="12" height={height * .6} rx="2" />)}</g>
          <path className="timing-marker" d="M430 35V278" />
          <circle className="timing-dot" cx="565" cy="63" r="5" />
        </svg>
        <div className="timing-legend"><span><i /> Asset</span><span><i /> Market comparison</span></div>
        <span className="timing-window-label">A changing window</span>
      </div>
      <div className="timing-stage-picker" aria-label="Explore the market checks">{CHECKS.map((check, index) => <button key={check.label} type="button" aria-pressed={stage === index} onClick={() => setStage(index)}><span>0{index + 1}</span>{check.label}</button>)}</div>
      <p className="timing-caption">{CHECKS[stage].caption}</p>
      <figcaption>Illustrative workflow, not live prices or a forecast.</figcaption>
    </figure>
    <div className="home-timing-steps">{CHECKS.map((check, index) => <article key={check.label} data-timing-step={index} data-active={stage === index}>
      <span className="home-story-eyebrow">0{index + 1} / {check.label}</span>
      <h3>{check.title}</h3><p>{check.text}</p><small>{check.note}</small>
    </article>)}<a className="home-story-link" href="/docs/intelligence">Explore the method <ArrowUpRight size={16} /></a></div>
  </div>;
}
