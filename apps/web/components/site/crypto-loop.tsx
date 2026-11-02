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
 * that moves while you are reading it is a distraction.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import BrandMark from "./brand-mark";

const STEPS = [
  {
    id: "discover",
    label: "01 / DISCOVER",
    title: "Pick your beat.",
    text: "Start with a supported coin or company in the topic catalog.",
    coreTop: "BTC",
    coreBottom: "SELECTED",
  },
  {
    id: "detect",
    label: "02 / DETECT",
    title: "Ask what changed.",
    text: "Save a cursor. On your next check, get the newly reported items.",
    coreTop: "+3",
    coreBottom: "NEW SINCE LAST CHECK",
  },
  {
    id: "verify",
    label: "03 / VERIFY",
    title: "Keep the receipts.",
    text: "Each headline comes with its publisher, timestamp and source link.",
    coreTop: "COINDESK",
    coreBottom: "14:02 UTC",
  },
] as const;

const TOPICS = [
  { symbol: "BTC", position: "btc" },
  { symbol: "ETH", position: "eth" },
  { symbol: "SOL", position: "sol" },
] as const;

export default function CryptoLoop() {
  const [step, setStep] = useState(0);
  // Once the reader takes over, the auto-advance stops for good. Re-starting it after
  // an interaction would pull the diagram out from under whatever they were reading.
  const [owned, setOwned] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (owned) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setStep((current) => (current + 1) % STEPS.length), 4600);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [owned]);

  const choose = useCallback((index: number) => {
    setOwned(true);
    setStep(index);
  }, []);

  const active = STEPS[step];

  return (
    <div className="bs-crypto-stage" id="crypto-loop-stage" data-step={active.id}>
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
            className={`bs-crypto-node bs-crypto-node-${topic.position}${step < 2 && topic.symbol === "BTC" ? " is-focus" : ""}`}
          >
            {topic.symbol} <small>RESEARCH TOPIC</small>
          </span>
        ))}

        {/* The packet that travels from the tracked asset to the core during DETECT. */}
        <span className="bs-crypto-packet" />
        <span className="bs-crypto-orbit-note">ILLUSTRATIVE TOPICS · NO PRICE FEED</span>
      </div>

      <div className="bs-crypto-path">
        <div className="bs-crypto-path-top">
          <span>THE RESEARCH LOOP</span>
          <span>{String(step + 1).padStart(2, "0")} — 03</span>
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
          Put your agent on the beat <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}
