"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, FileText, Pause, Play, ScanLine } from "lucide-react";
import BrandMark from "./brand-mark";
import "./landing-clarity.css";

const STEPS = [
  { label: "The evidence", title: "Find the actual change.", text: "Keep the reported development, its sources and its timing together." },
  { label: "The context", title: "Question the market story.", text: "Check available market observations. Keep possible explanations separate from what is measured." },
  { label: "The picture", title: "Give your agent a next step.", text: "An answer with evidence, uncertainty and an observable check that could change the view." },
] as const;

/** An explicit illustration of the research flow, never a simulated live signal. */
export default function LandingClarity() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(preference.matches);
    const visibility = () => setVisible(!document.hidden);
    motion(); visibility();
    preference.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(entries => setInView(entries[0]?.isIntersecting ?? false), { threshold: .18 });
    if (root.current) observer.observe(root.current);
    return () => { preference.removeEventListener("change", motion); document.removeEventListener("visibilitychange", visibility); observer.disconnect(); };
  }, []);
  const playing = !paused && !reduced && visible && inView;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep(value => (value + 1) % STEPS.length), 6000);
    return () => window.clearInterval(timer);
  }, [playing]);
  const choose = (index: number) => { setPaused(true); setStep(index); };

  return <figure className="clarity-flow" ref={root} data-step={step} data-playing={playing} onFocusCapture={event => { if ((event.target as HTMLElement).closest(".clarity-steps ol")) setPaused(true); }} aria-label="Illustrative research flow from reports to a clearer answer">
    <div className="clarity-flow-bar">
      <span><BrandMark size={19} /> THE PICTURE TAKES SHAPE</span>
      <div><span>ILLUSTRATIVE EXAMPLE</span><button type="button" disabled={reduced} aria-label={reduced ? "Motion disabled by your system preference" : paused ? "Play research illustration" : "Pause research illustration"} onClick={() => setPaused(value => !value)}>{paused || reduced ? <Play size={14} /> : <Pause size={14} />}</button></div>
    </div>
    <div className="clarity-flow-body">
      <div className="clarity-scene" aria-hidden="true">
        <div className="clarity-scene-label"><span>REPORTS IN</span><span>CONTEXT OUT</span></div>
        <svg className="clarity-links" viewBox="0 0 600 430" preserveAspectRatio="none">
          <path d="M245 107 C365 107 337 192 445 192 M245 190 H445 M245 275 C365 275 337 192 445 192" />
          <path className="clarity-packet" pathLength="100" d="M245 107 C365 107 337 192 445 192" />
          <path className="clarity-packet clarity-packet-later" pathLength="100" d="M245 275 C365 275 337 192 445 192" />
        </svg>
        <div className="clarity-feed">
          <div className="clarity-report"><FileText size={17} /><div><span>ORIGINAL REPORT</span><strong>A company raises its outlook.</strong><small>Source and publication time attached</small></div></div>
          <div className="clarity-report"><FileText size={17} /><div><span>RELATED COVERAGE</span><strong>The same update. More headlines.</strong><small>Repeated reporting grouped together</small></div></div>
          <div className="clarity-report"><ScanLine size={17} /><div><span>MARKET OBSERVATIONS</span><strong>What did the market do?</strong><small>Available measurements, checked separately</small></div></div>
        </div>
        <div className="clarity-hub"><i /><BrandMark size={43} /><span>RAREBIRD</span></div>
        <div className="clarity-market">
          <div><span>EXAMPLE MARKET COMPARISON</span><ScanLine size={16} /></div>
          <svg viewBox="0 0 440 130" preserveAspectRatio="none">
            <path className="clarity-chart-grid" d="M0 30 H440 M0 65 H440 M0 100 H440" />
            <path className="clarity-comparison" pathLength="100" d="M0 104 C42 105 52 85 85 88 S132 62 170 68 S220 51 260 57 S315 40 350 45 S402 26 440 32" />
            <path className="clarity-asset-line" pathLength="100" d="M0 110 C32 112 55 92 85 98 S132 48 168 58 S213 86 250 58 S297 59 330 31 S389 43 440 14" />
          </svg>
          <div className="clarity-chart-legend"><span><i /> Asset</span><span><i /> Comparison</span></div>
          <p>A move is an observation.<br /><strong>Its cause still needs evidence.</strong></p>
        </div>
        <div className="clarity-answer">
          <div className="clarity-answer-label"><BrandMark size={17} /><span>A CLEARER PICTURE</span></div>
          <h3>A stronger outlook.<br />A question worth investigating.</h3>
          <dl><div><dt>What changed</dt><dd>The company revised its outlook.</dd></div><div><dt>What’s uncertain</dt><dd>A market reaction is not established.</dd></div><div><dt>What to check</dt><dd>Guidance details and market confirmation.</dd></div></dl>
          <span className="clarity-answer-foot">Evidence + interpretation + limits <ArrowUpRight size={13} /></span>
        </div>
        <div className="clarity-scene-caption">{["One development. Its evidence stays attached.", "Test an explanation. Keep the gaps visible.", "Give the agent context it can question."][step]}</div>
      </div>
      <div className="clarity-steps">
        <div className="clarity-steps-heading"><span>FROM NEWS TO UNDERSTANDING</span><span>0{step + 1} / 03</span></div>
        <ol>{STEPS.map((item, index) => <li key={item.label} data-active={step === index}><button type="button" aria-pressed={step === index} onClick={() => choose(index)}><span className="clarity-step-label">0{index + 1} / {item.label}</span><strong>{item.title}<ArrowRight size={19} /></strong><p>{item.text}</p><i className="clarity-step-progress" /></button></li>)}</ol>
        <a href="/docs/try">Ask your own question <ArrowUpRight size={16} /></a>
      </div>
    </div>
    <figcaption>Illustrative workflow, not live market data.<a href="/intelligence">Explore real intelligence <ArrowUpRight size={13} /></a></figcaption>
  </figure>;
}
