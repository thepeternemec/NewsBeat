"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Square } from "lucide-react";
import type { ResearchResponse } from "@rarebird/contracts";
import type { LookupAsset } from "./landing-lookup-data";
import { ResearchDetails } from "./research-question";
import { requestResearch } from "./research-request";

type Check = {
  id: number;
  question: string;
  beatIds?: string[];
  state: { status: "loading" } | { status: "ready"; result: ResearchResponse } | { status: "error"; message: string };
};

export default function FeedConversation({ asset, children }: { asset: LookupAsset | null; children: ReactNode }) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => {
    const request = active.current;
    active.current = null;
    request?.abort();
  }, []);

  useEffect(() => {
    if (checks.length && thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [checks.length]);

  async function run(text: string, beatIds = asset ? [asset.beat_id] : undefined, retryId?: number) {
    const trimmed = text.trim();
    if (trimmed.length < 3 || trimmed.length > 600 || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const checkId = retryId ?? ++sequence.current;
    const next: Check = { id: checkId, question: trimmed, beatIds, state: { status: "loading" } };
    setChecks(previous => retryId === undefined ? [...previous, next] : previous.map(check => check.id === checkId ? next : check));
    setBusy(true);
    if (retryId === undefined) setQuestion("");
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) input.current?.blur();
    const timeout = window.setTimeout(() => controller.abort("timeout"), 35_000);
    try {
      const result = await requestResearch(trimmed, beatIds, controller.signal);
      if (active.current === controller) setChecks(previous => previous.map(check => check.id === checkId
        ? { ...check, state: { status: "ready", result } } : check));
    } catch (cause) {
      const message = controller.signal.reason === "stopped" ? "Check stopped. You can retry when you’re ready."
        : controller.signal.aborted ? "This check took too long. Try again."
          : cause instanceof Error ? cause.message : "Research is unavailable. Try again.";
      if (active.current === controller) setChecks(previous => previous.map(check => check.id === checkId
        ? { ...check, state: { status: "error", message } } : check));
    } finally {
      window.clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }

  return <div className="rb-feed-conversation">
    <div className="rb-feed-thread" ref={thread} data-lenis-prevent tabIndex={0} aria-label="Market updates and research answers">
      <div className="rb-feed-thread-content">
        {children}
        {checks.map(check => <section className="rb-feed-check" key={check.id} aria-label={check.question}>
          <p className="rb-feed-user-message">{check.question}</p>
          <div className="rb-feed-check-answer research-question">
            <p className="rb-feed-speaker">Rarebird</p>
            {check.state.status === "loading" && <p role="status">Checking reporting and market evidence…</p>}
            {check.state.status === "error" && <>
              <p role="alert">{check.state.message}</p>
              <button className="rb-feed-button" type="button" disabled={busy} onClick={() => void run(check.question, check.beatIds, check.id)}>Retry check</button>
            </>}
            {check.state.status === "ready" && <>
              <ResearchDetails result={check.state.result} onSelect={beatId => void run(check.question, [beatId], check.id)} />
              <p className="rb-feed-note">Checked <time dateTime={check.state.result.generated_at}>{new Date(check.state.result.generated_at).toLocaleString()}</time></p>
            </>}
          </div>
        </section>)}
      </div>
    </div>
    <div className="rb-feed-composer-wrap">
      <form className="rb-feed-composer" onSubmit={event => { event.preventDefault(); void run(question); }}>
        <label className="rb-feed-visually-hidden" htmlFor={id}>{asset ? "Ask about " + asset.label : "Ask a market question"}</label>
        <textarea ref={input} id={id} rows={2} minLength={3} maxLength={600} required enterKeyHint="send"
          value={question} onChange={event => setQuestion(event.target.value)}
          placeholder={asset ? "Ask about " + asset.label + "…" : "Ask about a company, token or market move…"}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }} />
        {busy ? <button type="button" className="rb-feed-send" aria-label="Stop market check" onClick={() => active.current?.abort("stopped")}><Square size={17} aria-hidden="true" /></button>
          : <button className="rb-feed-send" type="submit" disabled={question.trim().length < 3} aria-label="Send market question"><ArrowUp size={20} aria-hidden="true" /></button>}
      </form>
      <p className="rb-feed-composer-hint">Enter to send · Shift + Enter for a new line</p>
    </div>
  </div>;
}
