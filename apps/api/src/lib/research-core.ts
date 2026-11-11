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

/** Normalize presentation, not values: separators and trailing zeros may change; signs and magnitudes may not. */
export function researchFigures(text: string): string[] {
  return (text.match(/(?<!\d)[+-]?\d+(?:[.,]\d+)*/g) ?? []).map(token => {
    const value = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(token) ? token.replace(/,/g, "") : token;
    return /^[+-]?\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) ? String(Number(value)) : value;
  });
}

/** Allow exact known observation times in prose without treating date components as quantities. */
function figuresInClaim(text: string, sources: ResearchEvidence[]): string[] {
  let prose = text.toLowerCase();
  const known = new Set<string>();
  for (const source of sources) {
    const date = new Date(source.observed_at);
    if (!Number.isFinite(date.getTime())) continue;
    const iso = date.toISOString();
    for (const value of [source.observed_at, iso, iso.slice(0, 19) + "Z", iso.slice(0, 19),
      iso.slice(0, 19).replace("T", " "), iso.slice(0, 10), iso.slice(11, 19), iso.slice(11, 16)]) known.add(value.toLowerCase());
    for (const locale of ["en-GB", "en-US"]) for (const month of ["short", "long"] as const) {
      known.add(date.toLocaleDateString(locale, { timeZone: "UTC", year: "numeric", month, day: "numeric" }).toLowerCase());
    }
  }
  for (const time of [...known].sort((a, b) => b.length - a.length)) prose = prose.replaceAll(time, "");
  return researchFigures(prose);
}

/** Headline roles are retrieval heuristics, never a significance score or verification. */
export function researchEvidenceRole(item: ResearchEvidence) {
  if (item.id.startsWith("sec:") && item.source === "SEC EDGAR issuer record") return "official_filing_metadata";
  if (item.id.startsWith("sec:") && item.source === "SEC EDGAR US-GAAP XBRL") return "reported_financial_measurement";
  if (item.kind === "measurement") return "measurement";
  if (/\b(?:shares? (?:of .{0,100} )?(?:sold|purchased)|(?:increases?|reduces?|sells?|buys?|boosts?|cuts?) (?:its? )?(?:stake|holdings|position)|ownership|13f|portfolio|holdings? in)\b/i.test(item.text)) return "ownership_filing";
  if (/\b(?:analyst|maintained at|price target|rating|fair value|should you buy|buy the dip|looks (?:cheap|expensive)|is it (?:time|too late))\b/i.test(item.text)) return "opinion_or_valuation_commentary";
  if (/\b(?:stock|shares?|bitcoin|ethereum)\b.{0,70}\b(?:rises?|falls?|rall(?:y|ies)|crash|surge|trillion club)\b/i.test(item.text)) return "price_commentary";
  if (/\b(?:alleged|allegations?|reportedly|officials believe|suspected|accused|rumou?r)\b/i.test(item.text)) return "attributed_claim";
  return "reported_development";
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
    const numbers = new Set(sources.flatMap(e => researchFigures(e.text)));
    if (figuresInClaim(reason.claim, sources).some(n => !numbers.has(n))) return reject("unsupported_reasoning_figure");
  }
  const text = [answer.answer, ...answer.reasoning.map(r => r.claim), ...answer.unknowns, ...answer.next_checks].join(" ");
  if (/[<>]/.test(text) || /https?:\/\/|www\./i.test(text)) return reject("unsupported_format_or_instruction");
  if (/\b(?:buy|sell|short)\s+(?:now|today|immediately)\b|\bguaranteed\b|\bwill (?:rise|fall|rally|outperform)\b/i.test(text)) return reject("unsupported_instruction");
  const allNumbers = new Set([...cited].flatMap(id => researchFigures(byId.get(id)!.text)));
  if (figuresInClaim(text, [...cited].map(id => byId.get(id)!)).some(n => !allNumbers.has(n))) return reject("unsupported_answer_figure");
  return answer;
}
