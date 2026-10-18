/**
 * Headline sentiment.
 *
 * Taken from FomoX, where it was built because the Google News path supplies no
 * sentiment at all: the paid provider returns a score with each article, Google
 * returns a headline and a link. `ProviderArticleSchema` already has a
 * `sentiment` field, so Google-sourced rows carry `undefined` while paid rows
 * carry a number, and anything downstream has to handle both.
 *
 * This derives one from the headline. It is deliberately simple and deliberately
 * conservative: a weighted lexicon plus a set of financial phrases, squashed with
 * tanh so a single hysterical headline cannot pin the rail. Every call returns the
 * terms that moved it, so a reader can argue with the number.
 *
 * WHAT IT IS NOT
 *
 * A headline is a weak signal. This is directionally right on "beats estimates"
 * versus "probe opened" and it will be neutral on anything subtle. It is not a
 * model, it does not read the article, and it should not be presented as though
 * it did.
 *
 * Measured on real headlines before it was trusted:
 *
 *   "Stock Hits a New 52-Week High"      +0.38
 *   "CEO buys shares worth $23 million"  +0.41
 *   "Citi lifts target to USD 230"       +0.48
 *   "Beat estimates, revenue surges"     +0.73
 *   "SEC probe opened into fraud"        -0.71
 *   "Analyst cuts price target"          -0.48
 */

const BULL: Record<string, number> = {
  beat: 1.0, beats: 1.0, surge: 1.1, surges: 1.1, soar: 1.2, soars: 1.2,
  rally: 1.0, rallies: 1.0, jump: 0.9, jumps: 0.9, climb: 0.8, climbs: 0.8,
  gain: 0.7, gains: 0.7, rise: 0.7, rises: 0.7, high: 0.6, record: 0.9,
  upgrade: 1.1, upgraded: 1.1, outperform: 1.0, buy: 0.8, boost: 0.9,
  boosts: 0.9, strong: 0.7, growth: 0.7, profit: 0.6, wins: 0.8, win: 0.8,
  approval: 0.7, approved: 0.7, deal: 0.5, partnership: 0.6, expand: 0.6,
  expands: 0.6, bullish: 1.2, breakthrough: 1.0, doubled: 0.9, tops: 0.8,
};

const BEAR: Record<string, number> = {
  miss: 1.0, misses: 1.0, plunge: 1.2, plunges: 1.2, sink: 1.0, sinks: 1.0,
  fall: 0.8, falls: 0.8, drop: 0.8, drops: 0.8, slump: 1.0, slumps: 1.0,
  down: 0.6, low: 0.6, loss: 0.9, losses: 0.9, downgrade: 1.1, downgraded: 1.1,
  sell: 0.7, selloff: 1.1, cut: 0.8, cuts: 0.8, slash: 0.9, slashes: 0.9,
  warn: 0.9, warns: 0.9, warning: 0.9, probe: 0.9, lawsuit: 1.0, sued: 1.0,
  fraud: 1.3, investigation: 0.9, recall: 0.9, halt: 0.8, halted: 0.8,
  bearish: 1.2, weak: 0.8, concern: 0.6, concerns: 0.6, risk: 0.5, fears: 0.8,
  bankruptcy: 1.4, default: 1.1, layoffs: 0.9, crash: 1.2, tumbles: 1.1,
};

/**
 * Multi-word signals, checked before single words because the phrase is the
 * meaning: "lifts target" is an analyst upgrade, "lifts" alone is not. The first
 * version of this lexicon scored "Citi lifts target to USD 230" as neutral.
 */
const PHRASES: Array<[RegExp, number]> = [
  [/\b(raises?|lifts?|boosts?|hikes?)\s+(its\s+)?(price\s+)?target/i, 1.3],
  [/\b(cuts?|lowers?|slashes?|trims?)\s+(its\s+)?(price\s+)?target/i, -1.3],
  [/\bbeats?\s+(estimates?|expectations?)/i, 1.2],
  [/\bmisses?\s+(estimates?|expectations?)/i, -1.2],
  [/\b(insider|ceo|cfo|director)\s+buys?\b/i, 1.1],
  [/\bbuyback|share repurchase/i, 1.0],
  [/\b(52-week|all-time|record)\s+high/i, 1.0],
  [/\b(52-week|all-time)\s+low/i, -1.0],
  /* consumed but carries no direction, so it does not leak into the explanation */
  [/\bprice\s+prediction|price\s+forecast/i, 0],
  [/\bwhat'?s\s+(going\s+on|happening)/i, 0],
];

const DIRECTIONAL_VERB = /\b(lift|lifts|lifted|raise|raises|raised|buy|buys|bought|buying)\b/gi;

export interface HeadlineSentiment {
  /** -1 … +1, rounded to two places. */
  sentiment: number;
  /** The words and phrases that moved it, for explaining the number. */
  terms: string[];
}

export function scoreHeadline(title: string): HeadlineSentiment {
  const text = String(title ?? "");
  let score = 0;
  const terms: string[] = [];
  let remainder = text;

  for (const [re, weight] of PHRASES) {
    const m = remainder.match(re);
    if (!m) continue;
    score += weight;
    // A zero-weight entry only exists to consume the phrase, not to explain it.
    if (weight !== 0) terms.push(`${weight > 0 ? "+" : ""}${weight}:${m[0].toLowerCase().slice(0, 22)}`);
    remainder = remainder.replace(re, " ");
  }

  for (const word of remainder.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []) {
    const bull = BULL[word];
    const bear = BEAR[word];
    if (bull) {
      score += bull;
      terms.push(`+${word}`);
    } else if (bear) {
      score -= bear;
      terms.push(`-${word}`);
    }
  }

  // "lifts", "raises" and "buys" are directional outside a phrase too — they were
  // the commonest misses in the first pass.
  const verb = remainder.match(DIRECTIONAL_VERB);
  if (verb && !terms.some((t) => t.includes("target"))) {
    score += 0.5 * Math.min(verb.length, 2);
    terms.push(`+${verb[0].toLowerCase()}`);
  }

  if (!terms.length) return { sentiment: 0, terms: [] };

  // tanh keeps one hysterical headline from pinning the rail.
  const normalised = Math.tanh(score / 2.5);
  return { sentiment: Math.round(normalised * 100) / 100, terms: terms.slice(0, 4) };
}
