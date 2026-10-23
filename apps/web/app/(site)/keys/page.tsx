import InteriorPage from "@/components/site/interior-page";
import PageVisual from "@/components/site/page-visual";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";

export const metadata = { title: "Get an API key" };

export default function Keys() {
  return (
    <>
      <SiteNav active="/keys" />
      <InteriorPage className="keys-page">
        <div className="page-head">
          <div className="wrap intro-grid">
            <div className="intro-copy">
            <span className="sec-eyebrow">API keys</span>
            <h1 className="sec-title">A key, if you want one.</h1>
            <p className="sec-sub">
                Give your agent seven days to follow the companies and crypto you care about.
                The trial begins with its first metered request and includes up to $6 in usage credit.
                Check the time and credit left with your key. When either runs out, keyed requests
                pause; news remains free without a key at 120 requests a minute.
            </p>
            <div className="hero-cta">
              <a className="btn-primary" href="/api/keys/authorize">
                Sign in with GitHub <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/docs/quickstart">
                Or just start
              </a>
            </div>
            <p className="hero-tiny">asks for read:user and nothing else</p>
            </div>
            <PageVisual kind="keys" />
          </div>
        </div>

        <section className="scaffold">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">How it works</span>
              <h2 className="sec-title">Three things worth knowing.</h2>
            </div>

            <div className="features grid-4">
              <div className="feature" style={{ minHeight: 170 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>your trial</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  Connect an agent, ask about a ticker, then let it check for new headlines.
                  The seven-day clock starts on the first metered call. See the exact deadline and
                  remaining credit at <code>GET /api/keys/trial</code>.
                </p>
              </div>
              <div className="feature" style={{ minHeight: 170 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>shown once</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  Only a SHA-256 hash is stored, so the key cannot be recovered or shown again. Sign
                  in a second time and it rotates — the old one is revoked, and your trial date stays the same.
                </p>
              </div>
              <div className="feature" style={{ minHeight: 170 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>why GitHub</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  Because keys need an owner. Without some identity, minting keys is free and the
                  limit stops meaning anything — one person could hold a thousand. GitHub is the
                  identity a developer already has.
                </p>
              </div>
              <div className="feature" style={{ minHeight: 170 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>what we store</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  Your GitHub id, login and the key hash. Not your email, not your repositories, not
                  your followers. The requested scope is <code>read:user</code>.
                </p>
              </div>
            </div>

            <p className="hero-tiny" style={{ marginTop: 28 }}>
              Prefer not to? Ask, and a key is issued by hand — <code>npm run key:issue</code>. The
              API works either way.
            </p>
          </div>
        </section>
      </InteriorPage>
      <SiteFooter />
    </>
  );
}
