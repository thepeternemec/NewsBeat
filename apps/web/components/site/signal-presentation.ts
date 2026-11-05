import type { QuantSignalDecision } from "@newsbeat/contracts";

type TimingView = Pick<QuantSignalDecision, "phase" | "action">;
export interface SignalPresentation { state: "review" | "watch" | "hold" | "outside" | "reassess"; label: string; title: string; text: string }
const VIEWS: Record<QuantSignalDecision["phase"], SignalPresentation> = {
  data_hold: { state: "hold", label: "Waiting for data", title: "The picture is still incomplete.", text: "Reliable market information is missing. Your agent should wait for a fresh check." },
  analysis_hold: { state: "hold", label: "Being checked", title: "A new report needs a closer look.", text: "Fresh reporting has arrived. Review alerts stay on hold while the earlier view is checked." },
  inactive: { state: "hold", label: "Keep watching", title: "The market is too quiet to judge.", text: "There have not been enough recent trades to tell whether the news is being reflected in prices." },
  liquidity_hold: { state: "hold", label: "Keep watching", title: "Trading conditions make this hard to read.", text: "The observed market is too costly or thin to support a reliable timing signal." },
  old_information: { state: "watch", label: "Keep watching", title: "No fresh change to review yet.", text: "More coverage does not always change the picture. This update has not established a fresh reason for a review alert." },
  unconfirmed: { state: "watch", label: "Keep watching", title: "The story needs more confirmation.", text: "The news may matter, but the checks do not yet support a review alert." },
  developing: { state: "review", label: "Review now", title: "Worth a closer look.", text: "New information, market response and trading conditions line up. Your agent has a reason to review the evidence." },
  extended: { state: "watch", label: "Keep watching", title: "The move may already be advanced.", text: "The market has already moved strongly. Your agent should check what is still new before reacting." },
  fading: { state: "watch", label: "Keep watching", title: "The response is losing strength.", text: "Recent trading is no longer reinforcing the same view. Watch for new evidence before relying on it." },
  diverging: { state: "reassess", label: "Reassess", title: "The market tells a different story.", text: "Price behavior is moving against the reported hypothesis. Your agent should question the earlier view." },
  invalidated: { state: "reassess", label: "Reassess", title: "The premise needs another look.", text: "Reported evidence contradicts the earlier premise. Your agent should reassess that interpretation." },
};
/** Presentation only. It cannot upgrade a stored decision or bypass a hold. */
export function presentTiming(decision?: TimingView, stale = false): SignalPresentation {
  if (stale) return { state: "hold", label: "Refresh needed", title: "Get a fresh view first.", text: "These measurements are no longer current. Your agent should refresh before assessing timing." };
  if (!decision) return { state: "hold", label: "Building the picture", title: "A review signal is not ready yet.", text: "Your agent can still inspect the reporting. Current context is needed before an alert can be assessed." };
  if (decision.action === "no_alert") return { state: "outside", label: "Outside this focus", title: "Keep this out of the current review.", text: "The story does not match the focus you selected. A different question may call for a different view." };
  if (decision.action === "reassess") return VIEWS[decision.phase === "invalidated" ? "invalidated" : "diverging"];
  if (decision.phase === "developing" && decision.action !== "review_now") return VIEWS.unconfirmed;
  if (decision.action === "review_now" && decision.phase !== "developing") return VIEWS.data_hold;
  return VIEWS[decision.phase] ?? VIEWS.data_hold;
}
