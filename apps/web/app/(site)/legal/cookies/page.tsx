import InteriorPage from "@/components/site/interior-page";
import PageVisual from "@/components/site/page-visual";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";

export const metadata = {
  title: "Cookie notice",
  description: "Black Sheep sets no cookies. This page explains that, and what analytics run.",
};

/**
 * A cookie notice for a site that sets no cookies.
 *
 * Worth stating plainly rather than copying a template: a consent banner on a site
 * with no cookies trains people to dismiss banners, and asks consent for something
 * that is not happening. The true statement is shorter and more useful.
 */
export default function Cookies() {
  return (
    <>
      <SiteNav active="/legal/cookies" />
      <InteriorPage className="legal-page">
        <div className="page-head">
          <div className="wrap intro-grid">
            <div className="intro-copy">
            <span className="sec-eyebrow">Legal</span>
            <h1 className="sec-title">Cookie notice</h1>
            <p className="sec-sub">
              Black Sheep sets no cookies. Not for sessions, not for preferences, not for
              advertising. There is nothing to consent to, so there is no banner.
            </p>
            <p className="hero-tiny">Last updated 20 October 2026</p>
            </div>
            <PageVisual kind="legal" />
          </div>
        </div>

        <section className="scaffold">
          <div className="wrap-tight docs-body">
            <h2>What we store in your browser</h2>
            <p>
              Nothing. The site does not write cookies, <code>localStorage</code> or{" "}
              <code>sessionStorage</code>. There is no login session to keep, because the API
              requires no account to read.
            </p>

            <h2>Analytics</h2>
            <p>
              We use Vercel Analytics, which is cookieless. It records that a page was viewed and
              from which site a visitor arrived, using a value derived from the request and
              discarded — it does not build a profile, does not follow you to other sites, and sets
              no identifier that could be read back on a later visit. No personal data is stored.
            </p>
            <p>
              Because no cookie or comparable identifier is placed on your device, no consent is
              required for it under the ePrivacy Directive.
            </p>

            <h2>The API</h2>
            <p>
              The API authenticates with a bearer token in an <code>Authorization</code> header, not
              a cookie. Tokens are not written to the browser by this site — a self-served key is
              shown once at <a href="/keys">/keys</a> and is yours to store.
            </p>
            <p>
              Rate limiting identifies anonymous callers by calling address, hashed with a secret
              and never stored in the clear. That is a counter, not a tracker: it is not linked to a
              person and not shared.
            </p>

            <h2>Questions</h2>
            <p>
              Write to <a href="mailto:contact@newsbeat.dev">contact@newsbeat.dev</a>. If this ever
              changes — if a cookie is added — this page changes first, and a notice appears before
              the cookie is set.
            </p>

            <div className="docs-nav-foot">
              <a href="/legal/terms">Terms of service →</a>
              <a href="/docs">Documentation</a>
            </div>
          </div>
        </section>
      </InteriorPage>
      <SiteFooter />
    </>
  );
}
