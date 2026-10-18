import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import { FAQ, ROADMAP } from "@/components/site/content";

export default function Page() {
  return (
    <>
      <SiteNav active="/faq" />
      <main>
        <div className="page-head">
          <div className="wrap">
            <span className="sec-eyebrow">FAQ & status</span>
            <h1 className="sec-title">Before you connect.</h1>
            <p className="sec-sub">How NewsGraph works, what is available today, and what is coming next.</p>
          </div>
        </div>
        {/* FAQ */}
        <section className="scaffold" id="faq">
          <div className="wrap-tight">
            <div className="sec-head">
              <span className="sec-eyebrow">FAQ</span>
              <h2 className="sec-title">Your questions, answered.</h2>
            </div>
            <div className="faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <div className="a">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* STATUS */}
        <section className="scaffold" id="status">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Status</span>
              <h2 className="sec-title">Built today. Coming next.</h2>
              <p className="sec-sub">
                Connect through MCP or API today, with more integrations on the way.
              </p>
            </div>
            <div className="features grid-4">
              {ROADMAP.map((r) => (
                <div key={r.when} className="feature" style={{ minHeight: 160 }}>
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>{r.when}</span>
                  <p className="feature-desc" style={{ marginTop: 12 }}>{r.what}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
