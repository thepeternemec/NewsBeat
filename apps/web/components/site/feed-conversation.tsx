"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Square } from "lucide-react";
import type { AgentRequest, AgentResponse } from "@rarebird/contracts";
import type { LookupAsset } from "./landing-lookup-data";
import { requestAgent } from "./research-request";
import AgentAnswer from "./agent-answer";
import AgentBriefing from "./agent-briefing";

type Check = {
  id: number;
  question: string;
  beatIds?: string[];
  state: { status: "loading" } | { status: "ready"; result: AgentResponse } | { status: "error"; message: string };
};

export default function FeedConversation({ asset, market, onFollow, followedIds, children }: {
  asset: LookupAsset | null;
  market?: AgentRequest["market"];
  onFollow: (asset: LookupAsset) => void;
  followedIds: string[];
  children?: ReactNode;
}) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const latestCheck = useRef<HTMLElement>(null);
  const followAnswer = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const briefing = useRef<AgentResponse | null>(null);
  const recordBriefing = useCallback((result: AgentResponse) => { briefing.current = result; }, []);

  useEffect(() => () => {
    const request = active.current;
    active.current = null;
    request?.abort();
  }, []);

  const lastCheck = checks.at(-1);
  useEffect(() => {
    const container = thread.current;
    const latest = latestCheck.current;
    if (!container || !latest || !followAnswer.current) return;
    container.scrollTop += latest.getBoundingClientRect().top - container.getBoundingClientRect().top - 16;
  }, [lastCheck?.id, lastCheck?.state.status]);

  async function run(text: string, beatIds?: string[], retryId?: number) {
    const trimmed = text.trim();
    if (trimmed.length < 3 || trimmed.length > 600 || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    followAnswer.current = true;
    const checkId = retryId ?? ++sequence.current;
    const history: AgentRequest["history"] = checks.flatMap(check => check.id < checkId && check.state.status === "ready" ? [{
      question: check.question,
      answer: check.state.result.answer?.answer.slice(0, 900),
      beat_ids: check.state.result.assets.map(item => item.beat_id).slice(0, 3),
      tools: check.state.result.tools.map(item => item.id),
      context: check.state.result.context as "fundamentals" | "liquidity" | "risk",
      token_asset: check.state.result.token_asset,
    }] : []).slice(-4);
    if (!history.length && briefing.current) history.push({
      question: briefing.current.question,
      answer: briefing.current.answer?.answer.slice(0, 900),
      beat_ids: briefing.current.assets.map(item => item.beat_id).slice(0, 3),
      tools: briefing.current.tools.map(item => item.id),
      context: briefing.current.context as "fundamentals" | "liquidity" | "risk",
      token_asset: briefing.current.token_asset,
    });
    const scope = beatIds ?? (!history.length && asset ? [asset.beat_id] : undefined);
    const next: Check = { id: checkId, question: trimmed, beatIds: scope, state: { status: "loading" } };
    setChecks(previous => retryId === undefined ? [...previous, next] : previous.filter(check => check.id <= checkId).map(check => check.id === checkId ? next : check));
    setBusy(true);
    if (retryId === undefined) setQuestion("");
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) input.current?.blur();
    const timeout = window.setTimeout(() => controller.abort("timeout"), 55_000);
    try {
      const result = await requestAgent({ question: trimmed, beat_ids: scope, market, history }, controller.signal);
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
    <div className="rb-feed-thread" ref={thread} data-lenis-prevent tabIndex={0} aria-label="Market updates and research answers"
      onScroll={event => { const node = event.currentTarget; followAnswer.current = node.scrollHeight - node.clientHeight - node.scrollTop < 160; }}>
      <div className="rb-feed-thread-content">
        <AgentBriefing asset={asset} market={market} disabled={busy} onAsk={text => void run(text)} onFollow={onFollow} followedIds={followedIds} onResult={recordBriefing} />
        {children && <div className="rb-feed-tools-extra">{children}</div>}
        {checks.map(check => <section className="rb-feed-check" key={check.id} ref={check.id === lastCheck?.id ? latestCheck : undefined} aria-label={check.question}>
          <p className="rb-feed-user-message">{check.question}</p>
          <div className="rb-feed-check-answer research-question">
            {check.state.status === "loading" && <p role="status">Choosing the relevant Rarebird tools and checking current evidence…</p>}
            {check.state.status === "error" && <>
              <p role="alert">{check.state.message}</p>
              <button className="rb-feed-button" type="button" disabled={busy} onClick={() => void run(check.question, check.beatIds, check.id)}>Retry check</button>
            </>}
            {check.state.status === "ready" && <>
              <AgentAnswer result={check.state.result} disabled={busy} onAsk={text => void run(text)} onSelect={beatId => void run(check.question, [beatId], check.id)} onFollow={onFollow} followedIds={followedIds} />
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
          placeholder={asset ? "Ask anything about " + asset.label + " or the market…" : "Ask Rarebird anything about stocks, crypto, risks or forecasts…"}
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
