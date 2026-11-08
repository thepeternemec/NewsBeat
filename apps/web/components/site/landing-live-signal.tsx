"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";

const SignalInspector = dynamic(() => import("./signal-inspector"), {
  ssr: false,
  loading: () => <p className="home-live-loading" role="status">Opening the signal workspace…</p>,
});

/** Detailed data is read only when a visitor opens the real workspace. */
export default function LandingLiveSignal() {
  const [open, setOpen] = useState(false);
  return <div className="home-live-preview">
    <div className="home-live-actions"><button type="button" className="btn-primary" aria-expanded={open} aria-controls="home-signal-workspace" onClick={() => setOpen(value => !value)}>{open ? "Close the signal" : "Explore a real signal"}<ArrowDown size={16} aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }} /></button><a className="home-story-link" href="/intelligence">Open full workspace <ArrowUpRight size={16} /></a></div>
    <div id="home-signal-workspace" hidden={!open}>{open ? <SignalInspector /> : null}</div>
    <noscript><a href="/intelligence">Open the intelligence workspace</a></noscript>
  </div>;
}
