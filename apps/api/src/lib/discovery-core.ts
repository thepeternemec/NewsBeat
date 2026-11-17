import { createHash } from "node:crypto";
import { SEED_BEATS, type Beat, type DiscoveryAsset, type DiscoveryEvidence, type DiscoveryEvent, type DiscoveryKind, type FilingEvidence } from "@rarebird/contracts";
import { sameStory } from "./cluster.js";

const HOUR = 3600_000;
export const DISCOVERY_PRESS_HOURS = 24;
export const DISCOVERY_FILING_HOURS = 72;

const descriptions: Record<DiscoveryKind, { label: string; next: string; weight: number }> = {
  earnings: { label: "Reported results", next: "Compare the reported metrics with prior results and published expectations.", weight: 6 },
  guidance: { label: "Guidance change", next: "Compare the new range, period and assumptions with the prior issuer outlook.", weight: 8 },
  deal: { label: "Deal or agreement", next: "Check the parties, disclosed terms, whether it is signed and what approvals remain.", weight: 7 },
  regulation: { label: "Legal or regulatory action", next: "Open the original decision or filing. Check which entity, product and jurisdiction it covers.", weight: 7 },
  leadership: { label: "Leadership change", next: "Check the named role, effective date and succession plan in the issuer announcement.", weight: 6 },
  operations: { label: "Operational disruption", next: "Check the provider's status page or issuer notice for the start time, scope and recovery status.", weight: 7 },
  protocol: { label: "Protocol or listing change", next: "Verify the affected network or contract and the effective time with the protocol or venue.", weight: 6 },
  financing: { label: "Financing", next: "Check proceeds, pricing, issuance terms and potential dilution in the original disclosure.", weight: 5 },
  filing: { label: "Issuer filing", next: "Open the filing and read the affected item. Compare it with the issuer's previous disclosure.", weight: 5 },
};
const rules: ReadonlyArray<readonly [DiscoveryKind, RegExp[]]> = [
  ["regulation", [
    /\b(?:sues?|sued|lawsuit|settles?|settled|suspends?|suspended|halts?|blocks?|bans?|probes?|subpoena|charges?|charges filed|fines?|approves?|rejects?|issues?|obtains?|grants?)\b.{0,85}\b(?:antitrust|regulatory approval|license|licence|trading|event contracts?|market access|appeal|recall|injunction|enforcement|settlement|penalty|application|etf|patent|food and drug administration|fda|sec|cftc|court)\b/i,
    /\b(?:sec|cftc|court|fda|regulators?|justice department|competition authority)\b.{0,85}\b(?:sues?|sued|halts?|bans?|blocks?|probes?|charges?|fines?|approves?|rejects?|suspends?|orders?|clears?|files? (?:a )?(?:lawsuit|complaint)|opens? (?:an )?investigation)\b/i,
  ]],
  ["guidance", [
    /\b(?:raises?|lift(?:s|ed)?|cuts?|lowers?|slashe[sd]|withdraws?|withdrew|revises?|trims?|suspends?|reinstates?)\b.{0,55}\b(?:guidance|earnings forecast|revenue forecast|profit forecast|(?:sales|revenue|profit|earnings) outlook|full.year outlook)\b/i,
    /\b(?:guidance|profit forecast|revenue forecast|earnings outlook)\b.{0,45}\b(?:raised|cut|lowered|withdrawn|revised)\b/i,
  ]],
  ["leadership", [
    /\b(?:ceo|cfo|chief executive|chief financial officer|chair(?:person|man|woman)?|founder)\b.{0,75}\b(?:resigns?|resigned|steps? down|stepped down|ousted|fired|retires?|appointed|leaves?|left|succeeded)\b/i,
    /\b(?:resigns?|resigned|steps? down|stepped down|retires?|retired) as\b.{0,40}\b(?:ceo|cfo|chief executive|chief financial officer)\b/i,
    /\b(?:appoints?|names?|replaces?|dismisses?|removes?|ousts?)\b.{0,70}\b(?:ceo|cfo|chief executive|chief financial officer|chairperson|chairman|chairwoman)\b/i,
  ]],
  ["earnings", [
    /\b(?:reports?|reported|posts?|posted|releases?|announces?|publishes?)\b.{0,75}\b(?:quarterly results|financial results|earnings results|quarterly earnings|net loss|net income|(?:quarterly|annual|record) (?:revenue|profit))\b/i,
    /\b(?:earnings|revenue|profit|sales|eps)\b.{0,45}\b(?:beats?|misses?|tops?|falls? short of)\b.{0,35}\b(?:estimates?|expectations?|forecasts?|consensus)\b/i,
  ]],
  ["operations", [
    /\b(?:suffers?|suffered|confirms?|discloses?|reports?|hit by|experiences?|restores?|restored|halts?|suspends?|resumes?|pauses?)\b.{0,80}\b(?:outage|exploit|breach|withdrawals?|deposits?|operations?|cyberattack|ransomware|data theft|production)\b/i,
    /\b(?:outage|breach|cyberattack|ransomware|exploit)\b.{0,60}\b(?:confirmed|restored|disclosed|resolved|forced|disrupts?|caused|drains?|drained|halted|suspended)\b/i,
  ]],
  ["deal", [
    /\b(?:agrees? to (?:buy|acquire|merge|sell)|to be acquired by|enters? (?:an? )?(?:definitive|binding|merger) agreement|signs? (?:an? )?(?:definitive|binding|merger|supply) (?:agreement|deal)|completes? (?:the )?(?:its |an? )?(?:acquisition|merger|takeover)|announces? (?:an? )?(?:acquisition|takeover|buyout)|acquires? .{3,75} for (?:[$€£]|USD\s|\d)|acquired by .{3,75} for (?:[$€£]|USD\s|\d))\b/i,
  ]],
  ["financing", [
    /\b(?:raises?|raised|announces?|prices?|closes?|completes?|files? for)\b.{0,70}\b(?:(?:equity|stock|share|debt|bond|notes|securities) offerings?|private placement|capital raise|convertible (?:notes|bond|debt)|share repurchase|share buyback|funding round)\b/i,
    /\b(?:raises?|raised|secures?|secured)\s+(?:[$€£]|USD\s)\s*\d+(?:[.,]\d+)*(?:\s*(?:m|mn|b|bn|million|billion))\b/i,
  ]],
  ["protocol", [
    /\b(?:activates?|activated|deploys?|implements?|upgrades?|approved|passes?|votes? to)\b.{0,80}\b(?:mainnet|hard fork|network upgrade|protocol upgrade|governance proposal|token burn)\b/i,
    /\b(?:delists?|delisted|lists?|listed|suspends? trading in|opens? trading (?:in|for))\b.{0,65}\b(?:token|spot|perpetual|trading pair)\b/i,
  ]],
];
const noise = /\?|(?:\b(?:price targets?|price prediction|buy the dip|price forecast|best stocks? to buy|what to watch|what investors should|earnings preview|raises? its? stake|boosts? (?:its? )?(?:stake|holdings)|cuts? (?:its? )?(?:stake|holdings)|acquires? new (?:holdings|position)|form\s+4\b|13f\b|sells? [\d,]+ shares|buys? [\d,]+ shares|black friday|gift guide|coupon|price comparison|how to|lifehack|look(?:s|ing)? back|recalls? the time|year(?:s)? ago|years? later|after \d+ folds|sponsored|presale)\b)/i;
const speculation = /\b(?:reported affairs|alleged spy|allegedly|reportedly|rumou?rs?|rumou?red|could|might|may|is considering|in talks|is expected to|expected to|set to report|to report earnings|reports? earnings (?:on|next|this|tomorrow)|weighs?|not (?:yet )?(?:approved|signed|reported|filed)|denies? (?:the |a )?(?:rumou?r|claims?)|potential acquisition)\b/i;
const tickerWord = (s: string) => s.replaceAll(".", "-").toUpperCase();
const standard = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
// The catalog includes shortened issuer labels. Use the legal name for known collisions.
const preciseNames: Record<string, string[]> = { CCK: ["Crown Holdings"] };
const beats = new Map(SEED_BEATS.map(beat => [beat.beat_id, beat]));
const aliases = new Map(SEED_BEATS.map(beat => {
  const ticker = standard(beat.ticker);
  const names = [...new Set((preciseNames[beat.ticker] ?? [beat.label, ...beat.keywords]).map(standard).filter(term => term.length >= 3 && term !== ticker))];
  return [beat.beat_id, names];
}));
const tickerUse = new Map<string, number>();
for (const beat of SEED_BEATS) {
  const ticker = tickerWord(beat.ticker);
  tickerUse.set(ticker, (tickerUse.get(ticker) ?? 0) + 1);
}

const domainCue = /\b(?:inc|corp|company|shares?|stocks?|nasdaq|nyse|revenue|earnings|guidance|profit|quarterly|ceo|cfo|dividend|merger|acquisition|issuer|token|crypto|coin|protocol|chain|mainnet|exchange|wallet|network)\b/i;
const commonNames = new Set(["apple", "ripple", "optimism", "near", "base", "apt", "render", "pepe", "arbitrum one", "injective", "polygon", "arweave", "celo", "flow", "theta", "beam", "blur", "mask", "wrapped", "dash", "sui", "immutable", "aave", "sei", "stellar", "monera", "hedera", "mantle", "gala", "harmony", "helium", "quant", "core", "onyx", "ocean", "reserve", "civic", "origin", "eigen", "pendle", "myriad", "gate", "safe", "arc", "one", "alert", "link", "dase", "near protocol", "saga", "portal", "drift", "pocket", "magic", "move", "fuel"]);
const unrelated: Record<string, RegExp> = {
  AAPL: /\bapple (?:blossom|cider|juice|pie|picking|orchard|festival|harvest|growers?)\b/i,
  XRP: /\bripple effects?\b/i,
  DOGE: /\b(?:tribal grants?|department of government efficiency|federal layoffs?)\b/i,
};

function withAsset(title: string, beat: Beat) {
  if (unrelated[beat.ticker]?.test(title)) return false;
  const normalized = " " + standard(title) + " ";
  const names = aliases.get(beat.beat_id) ?? [];
  if (names.some(name => normalized.includes(" " + name + " ") && (!commonNames.has(name) || domainCue.test(title)))) {
    // On short and common protocol names, an unrelated stock headline with a market word is insufficient.
    if (beat.asset === "crypto" && !names.some(name => !commonNames.has(name) && normalized.includes(" " + name + " "))) {
      return /\b(?:token|crypto|coin|protocol|blockchain|mainnet|hard fork|governance|wallet|staking|defi|airdrops?)\b/i.test(title);
    }
    return true;
  }
  const ticker = tickerWord(beat.ticker);
  if ((tickerUse.get(ticker) ?? 0) > 1) return false;
  const written = escape(ticker).replaceAll("-", "[.-]");
  if (new RegExp("(?:\\$|\\b(?:NASDAQ|NYSE|AMEX)\\s*:\\s*)" + written + "(?![A-Za-z0-9.-])|\\b" + written + "/(?:USD|USDT)\\b", "i").test(title)) return true;
  if (beat.asset === "crypto" && ticker.length >= 3 && new RegExp("\\b" + written + "\\b").test(title)
    && /\b(?:token|crypto|coin|protocol|blockchain|mainnet|hard fork|governance|wallet|staking|defi|airdrop|stablecoin)\b/i.test(title)) return true;
  return ticker.length >= 3 && new RegExp("\\(" + written + "\\)").test(title) && domainCue.test(title);
}

export interface DiscoveryObservation {
  id: string;
  event_id: string;
  asset: DiscoveryAsset;
  kind: DiscoveryKind;
  evidence: Omit<DiscoveryEvidence, "recorded_at">;
}

const assetOf = (beat: Beat): DiscoveryAsset => ({ beat_id: beat.beat_id, ticker: beat.ticker, label: beat.label, asset: beat.asset ?? "equity" });
export const discoveryBeat = (id: string) => beats.get(id);
const urlOk = (value: string) => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};

/** Reject ambiguous subject matches and opinions before category ranking. */
export function pressDiscovery(row: { id: string; beat_id: string; title: string; url: string; source: string; published_at: string; indexed_at: string }): DiscoveryObservation | null {
  const beat = beats.get(row.beat_id);
  if (!beat || !row.source || !urlOk(row.url) || noise.test(row.title) || speculation.test(row.title) || !withAsset(row.title, beat)) return null;
  const kind = rules.find(([, patterns]) => patterns.some(pattern => pattern.test(row.title)))?.[0];
  if (!kind || (kind === "protocol" && beat.asset !== "crypto")) return null;
  if (kind === "leadership") {
    // A headline about an appointment elsewhere may mention the hire's former employer.
    const title = " " + standard(row.title) + " ";
    if ((aliases.get(beat.beat_id) ?? []).some(name =>
      new RegExp("\\b(?:names?|appoints?|hires?|taps?)\\b.{0,35}\\b" + escape(name) + " (?:executive|veteran|manager|employee)\\b").test(title))) return null;
  }
  // Keep punctuation that changes numeric meaning. Exact syndicated titles on several beats share one event.
  const titleKey = row.title.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
  const eventId = createHash("sha256").update(kind + "\n" + titleKey).digest("hex").slice(0, 32);
  return { id: "article:" + row.id, event_id: "reported:" + eventId, asset: assetOf(beat), kind,
    evidence: { type: "press", source: row.source, url: row.url, title: row.title, published_at: row.published_at, indexed_at: row.indexed_at } };
}

const materialItems: Record<string, DiscoveryKind> = {
  "1.01": "deal", "1.02": "deal", "2.01": "deal", "2.02": "earnings", "2.03": "financing",
  "2.05": "operations", "2.06": "filing", "3.01": "regulation", "3.02": "financing",
  "5.02": "leadership", "1.05": "operations",
};

export function filingDiscovery(beatId: string, filing: FilingEvidence, checkedAt: string): DiscoveryObservation | null {
  const beat = beats.get(beatId);
  if (!beat || beat.asset === "crypto") return null;
  const kind = filing.form.startsWith("10-") ? "filing" : filing.items.map(item => materialItems[item]).find(Boolean);
  if (!kind) return null;
  const description = filing.description === "Issuer current report" && filing.items.includes("1.05")
    ? "Material cybersecurity incident disclosure" : filing.description;
  return { id: filing.id + ":" + beatId, event_id: filing.id, asset: assetOf(beat), kind,
    evidence: { type: "official_filing", source: "SEC EDGAR", title: beat.label + " filed form " + filing.form + " · " + description,
      url: filing.url, published_at: filing.accepted_at, indexed_at: checkedAt } };
}

export type StoredDiscovery = DiscoveryObservation & { recorded_at: string };
export function rankDiscovery(rows: StoredDiscovery[], now: number, limit: number): DiscoveryEvent[] {
  const grouped: StoredDiscovery[][] = [];
  const byExact = new Map<string, StoredDiscovery[]>();
  const byAsset = new Map<string, Set<StoredDiscovery[]>>();
  const earlier = (a: StoredDiscovery, b: StoredDiscovery) => a.recorded_at.localeCompare(b.recorded_at)
    || a.evidence.indexed_at.localeCompare(b.evidence.indexed_at) || a.id.localeCompare(b.id);
  const headline = (row: StoredDiscovery) => ({ ...row.evidence, id: row.id });
  for (const row of [...rows].sort(earlier)) {
    const key = row.asset.beat_id + ":" + row.kind;
    const comparable = byAsset.get(key) ?? new Set<StoredDiscovery[]>();
    let group = byExact.get(row.event_id);
    if (!group && row.evidence.type === "press") {
      group = [...comparable].find(items => items.every(item => item.evidence.type === "press"
        && sameStory(headline(item), headline(row))));
    }
    if (!group) { group = []; grouped.push(group); }
    group.push(row);
    byExact.set(row.event_id, group);
    comparable.add(group);
    byAsset.set(key, comparable);
  }
  const candidates = grouped.map(ordered => {
    const lead = ordered[0]!, definition = descriptions[lead.kind];
    const firstPublication = Math.min(...ordered.map(row => Date.parse(row.evidence.published_at)));
    const age = Math.max(0, (now - firstPublication) / HOUR);
    const assets = [...new Map(ordered.map(row => [row.asset.beat_id, row.asset])).values()];
    const evidence = [...new Map([...ordered].reverse().map(row => [row.evidence.url, { ...row.evidence, recorded_at: row.recorded_at }])).values()].reverse();
    const sourceScore = lead.evidence.type === "official_filing" ? 2 : Math.min(1, (evidence.length - 1) * .25);
    const event: DiscoveryEvent = { id: lead.event_id, kind: lead.kind, label: definition.label, title: lead.evidence.title,
      assets: assets.slice(0, 8), first_recorded_at: lead.recorded_at, last_recorded_at: ordered.at(-1)!.recorded_at,
      evidence: evidence.slice(0, 4), next_check: definition.next };
    return { event, score: definition.weight + sourceScore + Math.max(0, 6 - age / 3) };
  }).sort((a, b) => b.score - a.score || b.event.first_recorded_at.localeCompare(a.event.first_recorded_at) || a.event.id.localeCompare(b.event.id));
  const counts = new Map<string, number>();
  const output: DiscoveryEvent[] = [];
  for (const { event } of candidates) {
    if (event.assets.every(asset => (counts.get(asset.beat_id) ?? 0) >= 2)) continue;
    for (const asset of event.assets) counts.set(asset.beat_id, (counts.get(asset.beat_id) ?? 0) + 1);
    output.push(event);
    if (output.length === limit) break;
  }
  return output;
}
