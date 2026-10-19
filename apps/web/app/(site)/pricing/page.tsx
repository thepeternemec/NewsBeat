import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import { PRICES } from "@/components/site/content";

export const metadata = {
  title: "Pricing",
  description:
    "Usage-based news access for AI agents. Published prepaid plans from $0.20 a day, with no seat licences. Free during early access.",
};

const ROUTES: Array<[string, string]> = [
  ["GET /v2/topics", "The catalog, with a status and article counts for every topic"],
  ["GET /v2/news", "Articles for one topic, plus a cursor to check from"],
  ["GET /v2/changes", "Only what appeared since that cursor — usually nothing"],
  ["GET /v2/brief", "The top headlines verbatim, with source and UTC time"],
  ["GET /v2/tools", "The same capabilities in OpenAI function-call shape"],
  ["POST /mcp", "The same tools over MCP"],
];

const TIERS: Array<{ name: string; limit: string; how: string }> = [
  { name: "Anonymous", limit: "120 requests / minute", how: "Nothing to send. The default." },
  { name: "With a key", limit: "1200 requests / minute", how: "Authorization: Bearer ng_…" },
];

export default function Pricing() {
  return (
    <>
      <SiteNav active="/pricing" />
      <main>
        <div className="page-head">
          <div className="wrap">
            <span className="sec-eyebrow">Pricing</span>
            <h1 className="sec-title">Pay for usage. No seat licences.</h1>
            <p className="sec-sub">
              Published prepaid plans start at $0.20 a day for up to fifty tickers on the
              fifteen-minute refresh schedule. Choose the plan that fits your agent workflow.
            </p>
            <div className="hero-cta">
              <a className="btn-primary" href="/connect">
                Connect your agent <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/dashboard">
                Explore live news
              </a>
            </div>
            <p className="hero-tiny">Free during early access · Stripe checkout coming soon</p>
          </div>
        </div>

        <section className="scaffold" id="today">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Today</span>
              <h2 className="sec-title">Start building today.</h2>
              <p className="sec-sub">
                Connect your agent and explore the API for free during early access.
                Stripe checkout for prepaid access is coming soon. Current request limits are below.
              </p>
            </div>
            <div className="table-scroll">
            <table className="docs-body" style={{ maxWidth: "100%" }}>
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Limit</th>
                  <th>How</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier) => (
                  <tr key={tier.name}>
                    <td style={{ color: "#fff" }}>{tier.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{tier.limit}</td>
                    <td>{tier.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="hero-tiny" style={{ marginTop: 16 }}>
              Public access needs no key. Optional keys raise the request limit and are currently
              issued by the operator.
            </p>
          </div>
        </section>

        <section className="scaffold" id="later">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Published prepaid plans</span>
              <h2 className="sec-title">One daily rate. Choose your balance.</h2>
              <p className="sec-sub">
                The planned prepaid balance is drawn down one day at a time. Every option uses
                the same daily rate, so you can choose how much access to fund upfront.
              </p>
            </div>
            <div className="features grid-4">
              {PRICES.map((p) => (
                <div key={p.label} className="feature" style={{ minHeight: 190 }}>
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>
                    {p.label}
                  </span>
                  <div className="metric-num" style={{ fontSize: 30, margin: "14px 0 10px" }}>
                    {p.price}
                  </div>
                  <p className="feature-desc">{p.desc}</p>
                </div>
              ))}
            </div>
            <p className="hero-tiny" style={{ marginTop: 16 }}>
              No seat licences or annual commitment. These are the published plans for paid access;
              the API remains free until billing launches.
            </p>
          </div>
        </section>

        <section className="scaffold" id="routes">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">The surface</span>
              <h2 className="sec-title">Connect through MCP or API.</h2>
              <p className="sec-sub">
                +2000 topics covered — equities and crypto — refreshed every fifteen
                minutes.
              </p>
            </div>
            <div className="table-scroll">
            <table className="docs-body" style={{ maxWidth: "100%" }}>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Returns</th>
                </tr>
              </thead>
              <tbody>
                {ROUTES.map(([route, what]) => (
                  <tr key={route}>
                    <td style={{ color: "#fff", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
                      {route}
                    </td>
                    <td>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="hero-tiny" style={{ marginTop: 16 }}>
              A topic reports <code>status</code> for whether the last check succeeded — which is not
              the same as whether there is news. Read <code>article_count</code> and{" "}
              <code>recent_12h</code> to see what is actually behind one.
            </p>
          </div>
        </section>

        <section className="cta-section">
          <div className="wrap">
            <h2 className="cta-title">Give your agent a market to watch.</h2>
            <p className="cta-sub">
              Choose your topics, connect through MCP or API, and start building with news
              your agent can use.
            </p>
            <div className="cta-row">
              <a className="btn-primary" href="/connect">
                Connect your agent <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/docs">Read the docs</a>
            </div>
            <p className="cta-tiny">The news layer for AI agents · Usage-based pricing · No seat licences</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
