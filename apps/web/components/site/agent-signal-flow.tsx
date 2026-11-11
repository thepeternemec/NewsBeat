"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, FileText, Pause, Play } from "lucide-react";
import BrandMark from "./brand-mark";
import "./agent-signal-flow.css";

const STEPS = [
  { label: "News", title: "A company changes its outlook.", text: "Reporting arrives with its source attached." },
  { label: "Context", title: "Has the picture changed?", text: "Rarebird checks what is new and how the market responds." },
  { label: "Your agent", title: "A reason to watch. A next check.", text: "Your agent receives the evidence, the interpretation and the limits." },
] as const;

export default function AgentSignalFlow() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [inView, setInView] = useState(true);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(preference.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion(); updateVisibility();
    preference.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(entries => setInView(entries[0]?.isIntersecting ?? false));
    if (root.current) observer.observe(root.current);
    return () => { preference.removeEventListener("change", updateMotion); document.removeEventListener("visibilitychange", updateVisibility); observer.disconnect(); };
  }, []);
  const playing = !paused && !reduced && visible && inView;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep(value => (value + 1) % STEPS.length), 4800);
    return () => window.clearInterval(timer);
  }, [playing]);
  return <figure className="signal-engine" ref={root} data-step={step} data-playing={playing} aria-label="Illustrative news-to-agent workflow">
    <div className="signal-engine-top"><span><i /> RAREBIRD IN MOTION</span><button type="button" disabled={reduced} onClick={() => setPaused(value => !value)} aria-label={reduced ? "Animation disabled by your motion preference" : paused ? "Play illustration" : "Pause illustration"} title={reduced ? "Motion disabled by your system preference" : paused ? "Play" : "Pause"}>{paused || reduced ? <Play size={13} /> : <Pause size={13} />}</button></div>
    <div className="signal-engine-scene">
      <svg className="signal-engine-links" viewBox="0 0 640 290" preserveAspectRatio="none" aria-hidden="true">
        <g className="signal-engine-rail" data-active={step === 0}><path d="M160 68 C240 68 228 145 320 145" /><path d="M160 145 H320" /><path d="M160 222 C240 222 228 145 320 145" /><path className="signal-engine-packet" d="M160 68 C240 68 228 145 320 145" /><path className="signal-engine-packet packet-later" d="M160 222 C240 222 228 145 320 145" /></g>
        <g className="signal-engine-rail" data-active={step === 2}><path d="M320 145 H490" /><path className="signal-engine-packet" d="M320 145 H490" /></g>
      </svg>
      <div className="signal-engine-sources" aria-hidden="true">{["Company update", "Related reporting", "Market response"].map(label => <div key={label}><FileText size={13} /><span>{label}</span><i /></div>)}</div>
      <div className="signal-engine-core" aria-hidden="true"><span className="signal-engine-halo" /><BrandMark size={76} /><span>CONTEXT</span></div>
      <div className="signal-engine-agent"><span>YOUR AGENT</span><strong>Keep watching</strong><p>Waiting for market confirmation.</p><span className="signal-engine-agent-note"><i /> Evidence attached</span></div>
      <div className="signal-engine-stage-labels" aria-hidden="true"><span>Reporting in</span><span>Understanding</span><span>Useful context</span></div>
    </div>
    <div className="signal-engine-caption"><strong>{STEPS[step]!.title}</strong><p>{STEPS[step]!.text}</p></div>
    <div className="signal-engine-controls" role="group" aria-label="Explore the news-to-agent flow">{STEPS.map((item, index) => <button key={item.label} type="button" aria-pressed={step === index} onClick={() => { setPaused(true); setStep(index); }}><span>{item.label}</span>{index < STEPS.length - 1 ? <ArrowRight size={12} aria-hidden="true" /> : null}</button>)}</div>
    <figcaption>Illustrative workflow · not a live alert</figcaption>
  </figure>;
}
