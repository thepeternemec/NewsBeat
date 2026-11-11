import type { IntelligenceResponse, QuantSignalDecision } from "@newsbeat/contracts";

type TimingView = Pick<QuantSignalDecision, "phase" | "action"> & Partial<Pick<QuantSignalDecision, "checks">>;
export interface SignalReadiness { constructed: boolean; analysisStatus?: IntelligenceResponse["status"]; loading?: boolean }
export interface SignalPresentation { state: "review" | "watch" | "hold" | "outside" | "reassess"; label: string; title: string; text: string }
const VIEWS: Record<QuantSignalDecision["phase"], SignalPresentation> = {
  data_hold: { state: "hold", label: "Waiting for data", title: "The picture is still incomplete.", text: "Reliable market information is missing. Your agent should wait for a fresh check." },
  analysis_hold: { state: "hold", label: "Being checked", title: "A new report needs a closer look.", text: "Fresh reporting has arrived. Review alerts stay on hold while the earlier view is checked." },
  inactive: { state: "hold", label: "Keep watching", title: "The market is too quiet to judge.", text: "There have not been enough recent trades to tell whether the news is being reflected in prices." },
  liquidity_hold: { state: "hold", label: "Keep watching", title: "Trading conditions make this hard to read.", text: "The observed market is too costly or thin to support a reliable timing signal." },
  old_information: { state: "watch", label: "Keep watching", title: "No fresh change to review yet.", text: "More coverage does not always change the picture. This update has not established a fresh reason for a review alert." },
  unconfirmed: { state: "watch", label: "Signal constructed", title: "The story needs more confirmation.", text: "The news may matter, but the checks do not yet support a review alert." },
  developing: { state: "review", label: "Review now", title: "Worth a closer look.", text: "New information, market response and trading conditions line up. Your agent has a reason to review the evidence." },
  extended: { state: "watch", label: "Keep watching", title: "The move may already be advanced.", text: "The market has already moved strongly. Your agent should check what is still new before reacting." },
  fading: { state: "watch", label: "Keep watching", title: "The response is losing strength.", text: "Recent trading is no longer reinforcing the same view. Watch for new evidence before relying on it." },
  diverging: { state: "reassess", label: "Reassess", title: "The market tells a different story.", text: "Price behavior is moving against the reported hypothesis. Your agent should question the earlier view." },
  invalidated: { state: "reassess", label: "Reassess", title: "The premise needs another look.", text: "Reported evidence contradicts the earlier premise. Your agent should reassess that interpretation." },
};
/** Presentation only. It cannot upgrade a stored decision or bypass a hold. */
export function presentTiming(decision?: TimingView, stale = false, readiness?: SignalReadiness): SignalPresentation {
  if (stale) return { state: "hold", label: "Refresh needed", title: "Get a fresh view first.", text: "These measurements are no longer current. Your agent should refresh before assessing timing." };
  if (readiness?.loading) return { state: "hold", label: "Loading context", title: "Reading the stored signal.", text: "Rarebird is loading the reported change and its latest market checks." };
  if (readiness?.analysisStatus === "unavailable") return { state: "hold", label: "Analysis delayed", title: readiness.constructed ? "Signal saved. Analysis needs a retry." : "The latest analysis needs a retry.", text: "The latest interpretation did not pass validation or could not be completed. Earlier evidence remains available; review alerts stay on hold." };
  if (readiness?.analysisStatus === "pending") return { state: "hold", label: readiness.constructed ? "Signal constructed" : "Analysis pending", title: "Fresh reporting is being checked.", text: "New reporting is waiting for a completed analysis. Your agent can inspect the stored context while new review alerts stay on hold." };
  if (readiness && !readiness.constructed) return { state: "hold", label: "Market hypothesis pending", title: "This report still needs a market hypothesis.", text: "The reporting is available, but this story does not yet have a constructed trigger and invalidation. Explore another development below." };
  if (!decision) return { state: "hold", label: readiness?.constructed ? "Signal constructed" : "Timing check pending", title: "Waiting for the next market check.", text: "The reported change and its hypothesis can be inspected now. Timing for this signal version has not been assessed yet; market checks run every five minutes." };
  if (decision.action === "no_alert") return { state: "outside", label: "Outside this focus", title: "Keep this out of the current review.", text: "The story does not match the focus you selected. A different question may call for a different view." };
  if (decision.action === "reassess") return VIEWS[decision.phase === "invalidated" ? "invalidated" : "diverging"];
  if (decision.phase === "developing" && decision.action !== "review_now") return VIEWS.unconfirmed;
  if (decision.action === "review_now" && decision.phase !== "developing") return VIEWS.data_hold;
  if (decision.phase === "unconfirmed") {
    const blocked = decision.checks?.filter(check => !check.passed).map(check => check.id) ?? [];
    const reasons: Record<string, string> = {
      reported_trigger: "The observable condition in the hypothesis has not been confirmed by a recent report. Your agent keeps watching for that development.",
      economic_materiality: "The possible economic effect is still too uncertain or lacks a clear direction. Your agent can investigate without treating it as an alert.",
      post_information_response: "The observed market has not moved in the hypothesis’s direction after the signal was recorded. Your agent keeps watching for confirmation.",
      relative_confirmation: "The move does not yet stand out enough from the market comparison. Your agent keeps watching rather than treating ordinary movement as an alert.",
      participation: "Trading activity does not yet support the move. Your agent keeps watching for broader participation.",
    };
    const reason = blocked.map(id => reasons[id]).find(Boolean);
    return { ...VIEWS.unconfirmed, ...(reason ? { text: reason } : {}) };
  }
  return VIEWS[decision.phase] ?? VIEWS.data_hold;
}

/** Open a constructed signal in this focus; preserve a visitor's explicit selection. */
export function selectSignalIndex(data: Pick<IntelligenceResponse, "signals" | "constructions">, selectedId: string | null = null) {
  const selected = data.signals.findIndex(signal => signal.id === selectedId);
  if (selected >= 0) return selected;
  const score = (index: number) => {
    const signal = data.signals[index]!;
    const construction = data.constructions.find(item => item.source_signal_id === signal.id);
    if (!construction?.assessment) return 0;
    if (construction.checks.find(check => check.id === "context")?.passed !== true) return 1;
    if (construction.action === "review_now") return 6;
    if (construction.action === "reassess") return 5;
    return construction.quantitative?.signal_version === signal.version ? 4 : 3;
  };
  return data.signals.reduce((best, _signal, index) => score(index) > score(best) ? index : best, 0);
}
