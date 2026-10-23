import InteriorPage from "@/components/site/interior-page";
import PageVisual from "@/components/site/page-visual";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";

export const metadata = { title: "Try NewsBeat with an API key", description: "Run a seven-day NewsBeat REST trial in your agent, starting with the first metered request. Up to $6 in usage credit; public news stays free." };

export default function Keys() {
  return (
    <>
      <SiteNav active="/keys" />
      <InteriorPage className="keys-page">
        <div className="page-head">
          <div className="wrap intro-grid">
            <div className="intro-copy">
            <span className="sec-eyebrow">API keys</span>
            <h1 className="sec-title">Seven days to try a real news workflow.</h1>
            <p className="sec-sub">
                Add a key to your agent’s REST integration and try company and crypto lookups in
                your own workflow. The seven-day clock starts with the first metered REST request,
                with up to $6 in usage credit. When time or credit runs out, public news still
                works without a key.
            </p>
            <div className="hero-cta">
              <a className="btn-primary" href="/api/keys/authorize">
                Sign in with GitHub <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/docs/quickstart">
                Use the free connection
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
              <h2 className="sec-title">A trial you can see and control.</h2>
            </div>

            <div className="features grid-4">
              <div className="feature" style={{ minHeight: 170 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>your trial</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  Ask your agent about a company, then check for new headlines as part of its
                  workflow. See the exact trial deadline and remaining credit at
                  <code> GET /api/keys/trial</code>.
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
                  GitHub sign-in links the key and trial to your account. You can rotate a lost
                  key without resetting the seven-day clock. NewsBeat asks for
                  <code> read:user</code> and no repository access.
                </p>
              </div>
              <div className="feature" style={{ minHeight: 170 }}>
                <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>what we store</span>
                <p className="feature-desc" style={{ marginTop: 14 }}>
                  We store your GitHub ID, login, key hash and any public profile details GitHub
                  returns, such as a name or email. We do not request access to your repositories.
                </p>
              </div>
            </div>

            <p className="hero-tiny" style={{ marginTop: 28 }}>
              Just connecting an assistant over MCP? <a href="/docs/quickstart">Start without a
              key</a>. The key is optional for metered REST use and allows up to 1,200 requests a minute.
            </p>
          </div>
        </section>
      </InteriorPage>
      <SiteFooter />
    </>
  );
}
