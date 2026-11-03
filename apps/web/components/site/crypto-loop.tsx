"use client";

/**
 * The research loop, as something you can operate rather than read.
 *
 * The section used to be a static diagram beside a numbered list: a series of
 * rings, three floating topic chips and an ordered list that never changed. Nothing
 * connected the two halves, so the illustration was decoration.
 *
 * Here the three steps drive the orbit. Each one shows what that step actually does to
 * an asset — it gets picked, a change is detected, the receipt arrives — so the diagram
 * is teaching the loop instead of sitting next to a description of it. It advances on
 * its own until someone touches it, and stops advancing once they do, because a thing
 * that moves while you are reading it is a distraction. Play resumes the sequence.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import BrandMark from "./brand-mark";

const STEPS = [
  {
    id: "discover",
    label: "01 / REPORTING IN",
    title: "Collect the evidence.",
    text: "Company and crypto reporting enters the feed with sources and publication times attached.",
    coreTop: "REPORTING",
    coreBottom: "SOURCES + TIMESTAMPS",
  },
  {
    id: "detect",
    label: "02 / INTERPRET",
    title: "Construct market context.",
    text: "Connect a reported change to demand, revenue, liquidity or risk. Form a hypothesis and define what would invalidate it.",
    coreTop: "CONTEXT",
    coreBottom: "HYPOTHESIS + EVIDENCE",
  },
  {
    id: "verify",
    label: "03 / AGENT CONTEXT",
    title: "Test the trigger.",
    text: "When context and reported conditions pass, record a review alert. Otherwise keep watching or reassess the premise.",
    coreTop: "SIGNAL",
    coreBottom: "ALERT / WATCH / REASSESS",
  },
] as const;

const TOPICS = [
  { symbol: "NVDA", position: "btc" },
  { symbol: "BTC", position: "eth" },
  { symbol: "AAPL", position: "sol" },
] as const;

export default function CryptoLoop() {
  const [step, setStep] = useState(0);
  // A chosen step pauses the sequence until the reader explicitly presses Play.
  const [owned, setOwned] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (owned) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timer.current = null;
      if (!preference.matches && !document.hidden) timer.current = window.setInterval(() => setStep((current) => (current + 1) % STEPS.length), 4600);
    };
    update();
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [owned]);

  const choose = useCallback((index: number) => {
    setOwned(true);
    setStep(index);
  }, []);

  const active = STEPS[step];

  return (
    <div className="bs-crypto-stage" id="crypto-loop-stage" data-step={active.id} data-paused={owned}>
      <div className="bs-crypto-orbit" aria-hidden="true">
        <div className="bs-crypto-rings" />
        <div className="bs-crypto-core">
          <BrandMark size={104} />
          <strong key={`top-${active.id}`} className="bs-crypto-core-value">{active.coreTop}</strong>
          <span key={`bottom-${active.id}`} className="bs-crypto-core-label">{active.coreBottom}</span>
        </div>

        {TOPICS.map((topic) => (
          <span
            key={topic.symbol}
            className={`bs-crypto-node bs-crypto-node-${topic.position}${topic.symbol === "NVDA" ? " is-focus" : ""}`}
          >
            {step === 2 ? topic.symbol === "NVDA" ? "YOUR AGENT" : topic.symbol === "BTC" ? "RESEARCH" : "WORKFLOW" : topic.symbol} <small>{step === 2 ? "CONTEXT" : "REPORTING"}</small>
          </span>
        ))}

        {/* The packet that travels from the tracked asset to the core during DETECT. */}
        <span className="bs-crypto-packet" />
        <span className="bs-crypto-return" />
        <span className="bs-crypto-orbit-note">ILLUSTRATIVE WORKFLOW · MCP / API</span>
      </div>

      <div className="bs-crypto-path">
        <div className="bs-crypto-path-top">
          <span>NEWS → CONTEXT → SIGNAL</span>
          <span>{String(step + 1).padStart(2, "0")} — 03</span>
          <button className="bs-loop-play" type="button" aria-label={owned ? "Play workflow animation" : "Pause workflow animation"} onClick={() => setOwned(value => !value)}>{owned ? "Play" : "Pause"}</button>
        </div>

        <ol>
          {STEPS.map((item, index) => (
            <li key={item.id} data-active={index === step}>
              <button
                type="button"
                onClick={() => choose(index)}
                aria-pressed={index === step}
                aria-controls="crypto-loop-stage"
              >
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </button>
            </li>
          ))}
        </ol>

        <a href="/docs/quickstart">
          Connect your agent <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}
