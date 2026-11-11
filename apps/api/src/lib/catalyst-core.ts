import { z } from "zod";
import type { CatalystCoverage, CatalystRadar, FilingEvidence, ReportedComparison } from "@newsbeat/contracts";

export const OFFICIAL_ISSUERS = [
  { beat_id: "b_bb964843350e", label: "NVIDIA", cik: "0001045810" },
  { beat_id: "b_7d5acdda6186", label: "Apple", cik: "0000320193" },
  { beat_id: "b_a723a1d2787f", label: "Microsoft", cik: "0000789019" },
  { beat_id: "b_c0c3f9282a94", label: "Alphabet", cik: "0001652044" },
] as const;
export type OfficialIssuer = (typeof OFFICIAL_ISSUERS)[number];
export const OFFICIAL_FRESH_MS = 30 * 60_000;
const DAY = 86_400_000;
const ACCESSION = /^\d{10}-\d{2}-\d{6}$/;
const FORMS = new Set(["8-K", "8-K/A", "10-Q", "10-Q/A", "10-K", "10-K/A"]);
const ITEM_LABELS: Record<string, string> = {
  "1.01": "Material agreement", "1.02": "Agreement termination",
  "2.01": "Acquisition or disposition", "2.02": "Reported operating results",
  "2.03": "Financial obligation", "2.05": "Restructuring costs", "2.06": "Asset impairment",
  "3.01": "Listing notice", "5.02": "Leadership or compensation change",
  "7.01": "Regulation FD disclosure", "8.01": "Other issuer event",
};

export function filingUrl(cik: string, accession: string, document?: string) {
  if (!/^\d{10}$/.test(cik) || !ACCESSION.test(accession)) throw new Error("invalid_filing_identity");
  const root = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll("-", "")}/`;
  return document && /^[a-zA-Z0-9_.-]+\.html?$/.test(document)
    ? root + document : root + accession + "-index.html";
}

/** Only the named issuer's SEC record can supply a filing identity and acceptance time. */
export function parseFilings(raw: unknown, issuer: OfficialIssuer, now: number): FilingEvidence[] {
  const strings = z.array(z.string());
  const body = z.object({ cik: z.union([z.string(), z.number()]), filings: z.object({ recent: z.object({
    accessionNumber: strings, form: strings, acceptanceDateTime: strings, filingDate: strings,
    reportDate: strings, primaryDocument: strings, items: strings,
  }) }) }).parse(raw);
  if (Number(body.cik) !== Number(issuer.cik)) throw new Error("issuer_mismatch");
  const rows = body.filings.recent;
  const seen = new Set<string>();
  return rows.accessionNumber.flatMap((accession, index) => {
    const form = rows.form[index] ?? "";
    const accepted = rows.acceptanceDateTime[index] ?? "";
    const time = /(?:Z|[+-]\d{2}:\d{2})$/.test(accepted) ? Date.parse(accepted) : NaN;
    if (!ACCESSION.test(accession) || !FORMS.has(form) || seen.has(accession)
      || !Number.isFinite(time) || time > now || now - time > 120 * DAY) return [];
    seen.add(accession);
    const items = (rows.items[index] ?? "").split(",").map(item => item.trim()).filter(item => /^\d\.\d{2}$/.test(item));
    const labels = items.map(item => ITEM_LABELS[item]).filter(Boolean);
    return [{ id: `sec:${issuer.cik}:${accession}`, accession, form,
      accepted_at: new Date(time).toISOString(), filed_on: rows.filingDate[index] ?? accepted.slice(0, 10),
      report_date: rows.reportDate[index] || null, items,
      description: form.startsWith("10-") ? (form.startsWith("10-K") ? "Annual financial report" : "Quarterly financial report") : labels.join(" · ") || "Issuer current report",
      url: filingUrl(issuer.cik, accession, rows.primaryDocument[index]),
    }];
  }).sort((a, b) => b.accepted_at.localeCompare(a.accepted_at) || a.id.localeCompare(b.id)).slice(0, 12);
}

const FactSchema = z.object({
  start: z.string(), end: z.string(), val: z.number().finite(), accn: z.string().regex(ACCESSION),
  filed: z.string(), form: z.string(),
});
type Fact = z.infer<typeof FactSchema>;
export const FINANCIAL_CONCEPTS = [
  { metric: "revenue", label: "Revenue", concept: "RevenueFromContractWithCustomerExcludingAssessedTax" },
  { metric: "net_income", label: "Net income", concept: "NetIncomeLoss" },
  { metric: "operating_income", label: "Operating income", concept: "OperatingIncomeLoss" },
] as const;

function duration(fact: Fact) { return (Date.parse(fact.end) - Date.parse(fact.start)) / DAY + 1; }
function period(fact: Fact) {
  const days = duration(fact);
  if (days >= 75 && days <= 105) return "quarter" as const;
  if (days >= 350 && days <= 380) return "year" as const;
  return null;
}

/** A comparison uses one concept, unit and duration. Later filings cannot rewrite its baseline. */
export function compareReportedConcept(raw: unknown, issuer: OfficialIssuer,
  definition: (typeof FINANCIAL_CONCEPTS)[number], filings: FilingEvidence[], now: number): ReportedComparison | null {
  const body = z.object({ cik: z.union([z.string(), z.number()]), taxonomy: z.literal("us-gaap"), tag: z.string(), units: z.record(z.array(z.unknown())) }).parse(raw);
  if (Number(body.cik) !== Number(issuer.cik) || body.tag !== definition.concept) throw new Error("concept_mismatch");
  const facts = (body.units.USD ?? []).flatMap(value => {
    const parsed = FactSchema.safeParse(value);
    if (!parsed.success) return [];
    const fact = parsed.data;
    const start = Date.parse(fact.start), end = Date.parse(fact.end), filed = Date.parse(fact.filed);
    return FORMS.has(fact.form) && Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(filed)
      && start <= end && end <= filed && filed <= now && period(fact) ? [fact] : [];
  });
  const matching = facts.filter(fact => filings.some(filing => filing.accession === fact.accn
    && filing.report_date === fact.end && (filing.form.startsWith("10-K") ? period(fact) === "year"
      : filing.form.startsWith("10-Q") && period(fact) === "quarter")))
    .sort((a, b) => b.end.localeCompare(a.end) || a.filed.localeCompare(b.filed));
  const current = matching[0];
  if (!current || now - Date.parse(current.end) > 150 * DAY) return null;
  const candidates = facts.filter(fact => fact.accn !== current.accn && fact.filed < current.filed
    && period(fact) === period(current) && Math.abs(duration(fact) - duration(current)) <= 7
    && Math.abs((Date.parse(current.end) - Date.parse(fact.end)) / DAY - 365.25) <= 10)
    .sort((a, b) => a.filed.localeCompare(b.filed));
  const previous = candidates[0];
  if (!previous) return null;
  const point = (fact: Fact) => ({ start: fact.start, end: fact.end, value: fact.val,
    filing_id: `sec:${issuer.cik}:${fact.accn}`, url: filingUrl(issuer.cik, fact.accn), filed_on: fact.filed });
  const change = current.val - previous.val;
  return { metric: definition.metric, label: definition.label, concept: definition.concept, unit: "USD",
    period: period(current)!, current: point(current), previous: point(previous), change,
    change_percent: previous.val > 0 ? change / previous.val * 100 : null,
    method: "same_concept_prior_year_as_known_at_filing" };
}

export function buildCatalystRadar(coverage: CatalystCoverage[], limit: number, now: number): CatalystRadar {
  const items = coverage.filter(asset => asset.status === "fresh").flatMap(asset =>
    (asset.snapshot?.filings ?? []).filter(filing => {
      const age = now - Date.parse(filing.accepted_at);
      return age >= 0 && age <= 3 * DAY && (filing.form.startsWith("10-") || filing.items.some(item => item in ITEM_LABELS));
    }).map(filing => ({ ...filing, beat_id: asset.beat_id, label: asset.label,
      action: "investigate_filing" as const,
      reported_revenue: asset.snapshot?.comparisons.find(comparison => comparison.metric === "revenue" && comparison.current.filing_id === filing.id) ?? null,
      next_check: "Read the issuer document, establish what changed against its previous disclosure, then test expectations and event-aligned market evidence.",
    })))
    .sort((a, b) => b.accepted_at.localeCompare(a.accepted_at) || a.id.localeCompare(b.id));
  const fresh = coverage.filter(asset => asset.status === "fresh").length;
  const supported = coverage.filter(asset => asset.status !== "unsupported").length;
  return { generated_at: new Date(now).toISOString(), status: fresh === 0 ? "unavailable" : fresh === supported ? "ready" : "partial",
    items: items.slice(0, limit), coverage,
    method: "Issuer SEC filings accepted in the last 72 hours, ordered by acceptance time. Financial comparisons use the same USD concept and a comparable prior-year period as originally reported. Filing metadata establishes a disclosure exists. Its contents, guidance changes, consensus surprise and market causality still require investigation.",
  };
}
