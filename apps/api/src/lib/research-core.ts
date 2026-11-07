import { SEED_BEATS, ResearchAnswerSchema, type Beat, type ResearchAnswer, type ResearchEvidence } from "@newsbeat/contracts";

const STOP = new Set("a an the is are was were be been being it on in at to for of or and with from by as has have had can could may might will would should do does did all any now new why how what when where which who market markets stock stocks crypto news price prices risk risks data flow near link target core best buy sell next last today yesterday tomorrow week weeks month months year years gas request research signal signals intelligence outlook context timing act action capital demand expectations performance change changes changed moving moved pressure reaction return returns".split(" "));
const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
const words = (s: string, term: string) => (" " + normalize(s) + " ").includes(" " + normalize(term) + " ");
export const assetView = (b: Beat) => ({ beat_id: b.beat_id, ticker: b.ticker, label: b.label, asset: b.asset ?? "equity" });

/** Resolve identities before retrieving evidence. Colliding symbols never silently choose a market. */
export function resolveResearchAssets(question: string, ids?: string[]) {
  if (ids?.length) {
    const found = [...new Set(ids)].map(id => SEED_BEATS.find(b => b.beat_id === id));
    if (found.some(b => !b)) return { assets: [] as Beat[], candidates: [], issue: "An asset ID is outside the supported catalog." };
    return { assets: found as Beat[], candidates: [], issue: null };
  }
  const q = normalize(question);
  const exact = SEED_BEATS.filter(b => [b.label, b.ticker, ...b.keywords].some(alias => normalize(alias) === q));
  if (exact.length === 1) return { assets: exact, candidates: [], issue: null };
  if (exact.length > 1) return { assets: [] as Beat[], candidates: exact.map(assetView), issue: "This name or ticker identifies more than one asset. Choose the stock or crypto asset." };
  const symbolMatches = SEED_BEATS.filter(b => {
    const ticker = b.ticker.replace(/\.[A-Z]$/, "");
    return words(question, ticker) && (question.includes("$" + ticker) || (!STOP.has(ticker.toLowerCase()) && ticker.length >= 2));
  });
  const questionWords = " " + q + " ";
  const nameMatches = SEED_BEATS.flatMap(asset => [asset.label, ...asset.keywords].flatMap(alias => {
    const name = normalize(alias).replace(/\b(?:inc|incorporated|corp|corporation|plc|ltd|limited|class a|class b|holdings)\b/g, "").trim();
    if (name.length < 4 || STOP.has(name)) return [];
    const matches: Array<{ asset: Beat; start: number; end: number }> = [];
    let position = questionWords.indexOf(" " + name + " ");
    while (position >= 0) {
      matches.push({ asset, start: position, end: position + name.length + 2 });
      position = questionWords.indexOf(" " + name + " ", position + 1);
    }
    return matches;
  }));
  // A tokenized instrument's full name must not also select its underlying company.
  // A separately mentioned underlying name still survives for explicit comparisons.
  const named = [...new Map(nameMatches.filter(match => !nameMatches.some(other =>
    other.asset.beat_id !== match.asset.beat_id && other.start <= match.start && other.end >= match.end
      && other.end - other.start > match.end - match.start)).map(match => [match.asset.beat_id, match.asset])).values()];
  // A full name can disambiguate a symbol shared with another catalog entry.
  const chosen = [...new Map([...named, ...symbolMatches.filter(b => !named.some(n => n.ticker === b.ticker))].map(b => [b.beat_id, b])).values()];
  const collision = chosen.some(b => chosen.some(other => other.beat_id !== b.beat_id && other.ticker.toLowerCase() === b.ticker.toLowerCase()));
  if (collision || chosen.length > 3) return { assets: [] as Beat[], candidates: chosen.slice(0, 12).map(assetView), issue: collision ? "A ticker is ambiguous. Choose the exact asset before research." : "Choose up to three assets for one evidence comparison." };
  if (!chosen.length) return { assets: [] as Beat[], candidates: [], issue: "Name a supported company or crypto asset, or provide its beat_id. Broad market questions need an explicit asset scope; catalog news coverage is not a whole-market price feed." };
  return { assets: chosen, candidates: [], issue: null };
}

export function qualifiesReport(title: string, asset: Beat): boolean {
  if (normalize(asset.label) === "apple" && words(title, "apple")) {
    return /\b(?:aapl|iphone|ipad|macbook|ios|siri|tim cook|app store|earnings|revenue|shares|stock|antitrust|tariffs?|supply chain|apple intelligence)\b/i.test(title);
  }
  return [asset.label, ...asset.keywords].some(alias => normalize(alias).length >= 3 && words(title, alias))
    || (asset.ticker.length >= 3 && words(title, asset.ticker));
}

export function researchIntent(question: string) {
  if (/\b(?:why|driver|driving|cause|because)\b/i.test(question)) return "drivers";
  if (/\b(?:compare|versus|vs|relative)\b/i.test(question)) return "comparison";
  if (/\b(?:unusual|anomal|dislocation|abnormal)\b/i.test(question)) return "anomaly";
  if (/\b(?:when|timing|late|early|act|buy|sell|entry|exit)\b/i.test(question)) return "timing";
  if (/\b(?:risk|downside|danger|weakness)\b/i.test(question)) return "risk";
  return "context";
}

/** Citation membership and numeric grounding are enforced independently of model instructions. */
export function validateResearchAnswer(raw: unknown, evidence: ResearchEvidence[], onInvalid?: (reason: string) => void): ResearchAnswer | null {
  const reject = (reason: string): null => { onInvalid?.(reason); return null; };
  const parsed = ResearchAnswerSchema.safeParse(raw);
  if (!parsed.success) return reject("invalid_shape");
  const answer = parsed.data;
  if (!answer.reasoning.some(reason => reason.kind === "interpretation")) return reject("missing_reasoning");
  const byId = new Map(evidence.filter(e => e.freshness === "fresh").map(e => [e.id, e]));
  const cited = new Set<string>();
  for (const reason of answer.reasoning) {
    if (reason.evidence_ids.some(id => !byId.has(id))) return reject("invalid_citation");
    reason.evidence_ids.forEach(id => cited.add(id));
    const sources = reason.evidence_ids.map(id => byId.get(id)!);
    if (reason.kind === "observation" && (sources.length !== 1 || reason.claim !== sources[0]!.text)) return reject("altered_observation");
    const numbers = new Set(sources.flatMap(e => e.text.match(/\d+(?:[.,]\d+)*/g) ?? []));
    if ((reason.claim.match(/\d+(?:[.,]\d+)*/g) ?? []).some(n => !numbers.has(n))) return reject("unsupported_reasoning_figure");
  }
  const text = [answer.answer, ...answer.reasoning.map(r => r.claim), ...answer.unknowns, ...answer.next_checks].join(" ");
  if (/[<>]/.test(text) || /https?:\/\/|www\./i.test(text)) return reject("unsupported_format_or_instruction");
  if (/\b(?:buy|sell|short)\s+(?:now|today|immediately)\b|\bguaranteed\b|\bwill (?:rise|fall|rally|outperform)\b/i.test(text)) return reject("unsupported_instruction");
  const allNumbers = new Set([...cited].flatMap(id => byId.get(id)!.text.match(/\d+(?:[.,]\d+)*/g) ?? []));
  if ((text.match(/\d+(?:[.,]\d+)*/g) ?? []).some(n => !allNumbers.has(n))) return reject("unsupported_answer_figure");
  return answer;
}
