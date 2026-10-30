import InteriorPage from "@/components/site/interior-page";
import PageVisual from "@/components/site/page-visual";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import { FAQ, ROADMAP } from "@/components/site/content";

export const metadata = { title: "Black Sheep FAQ", description: "How to ask your assistant about company news, connect Black Sheep, and let your agent check current information when it helps." };

export default function Page() {
  return (
    <>
      <SiteNav active="/faq" />
      <InteriorPage className="faq-page">
        <div className="page-head">
          <div className="wrap intro-grid">
            <div className="intro-copy">
            <span className="sec-eyebrow">FAQ & status</span>
            <h1 className="sec-title">Ask naturally. Get the news.</h1>
            <p className="sec-sub">Ask your AI assistant what is happening with a company. Black Sheep brings the latest available headlines and sources into the answer.</p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/quickstart">Set up your assistant</a>
              <a className="btn-ghost" href="/dashboard">Explore news first</a>
            </div>
            </div>
            <PageVisual kind="faq" />
          </div>
        </div>
        {/* FAQ */}
        <section className="scaffold" id="faq">
          <div className="wrap faq-layout">
            <div className="section-aside">
            <div className="sec-head">
              <span className="sec-eyebrow">FAQ</span>
              <h2 className="sec-title">Your questions, answered.</h2>
            </div>
            <p>From your first question to your next integration.</p>
            <a className="aside-contact" href="https://x.com/blacksheep_"><span>Can’t find the answer?</span>@blacksheep_ on X <span aria-hidden="true">↗</span></a>
            <a className="quiet-link" href="#status">See what’s available ↓</a>
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
                Company and crypto news for connected assistants today. More coverage and easier integrations are on the way.
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
      </InteriorPage>
      <SiteFooter />
    </>
  );
}
