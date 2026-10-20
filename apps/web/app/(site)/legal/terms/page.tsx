import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";

export const metadata = {
  title: "Terms of service",
  description: "The terms that apply to using NewsBeat, written to match what the service actually does.",
};

/**
 * Terms of service.
 *
 * Every factual claim here is drawn from the codebase rather than from another
 * company's document: the metered key with its $5 trial and 402, the anonymous
 * 120-a-minute tier, headlines-only with links to publishers, the fifteen-minute
 * refresh, the absence of any account for readers. Terms that describe a service
 * other than the one being operated are worse than no terms, because they bind.
 *
 * Two facts cannot come from code — the registered entity and the forum for
 * disputes. They are marked and must be completed before this is relied on.
 */
export default function Terms() {
  return (
    <>
      <SiteNav active="/legal/terms" />
      <main>
        <div className="page-head">
          <div className="wrap">
            <span className="sec-eyebrow">Legal</span>
            <h1 className="sec-title">Terms of service</h1>
            <p className="sec-sub">
              What you agree to by using NewsBeat, and what we agree to. Short, because the
              service is small and most of it is public.
            </p>
            <p className="hero-tiny">Last updated 20 October 2026</p>
          </div>
        </div>

        <section className="scaffold">
          <div className="wrap-tight docs-body">
            <h2>1. Who operates this</h2>
            <p>
              NewsBeat.dev is operated by founder Peter Nemec through <strong>Tephra d.o.o.</strong>,
              a company registered in the court register of the Republic of Slovenia
              (&ldquo;NewsBeat&rdquo;, &ldquo;we&rdquo;). You can reach us at{" "}
              <a href="mailto:hello@newsbeat.dev">hello@newsbeat.dev</a>.
            </p>

            <h2>2. What the service is</h2>
            <p>
              A read-only interface to financial news headlines: a catalogue of equities and crypto
              assets, the headlines attached to each, and a cursor that answers one question —{" "}
              <em>has this topic moved since I last asked?</em> It is available as HTTP endpoints and
              as tools over MCP.
            </p>
            <p>
              Headlines come from Google News RSS, refreshed on a fifteen-minute schedule. Coverage
              varies by asset and is not guaranteed for any particular one.
            </p>

            <h2>3. What the service is not</h2>
            <ul>
              <li>
                <strong>It is not a source of article text.</strong> An item carries a headline, the
                publisher&rsquo;s name, a publication time and a link. There is no article body at
                any price, and no licence to one is granted here.
              </li>
              <li>
                <strong>It is not a search engine or a feed.</strong> You name a topic; we do not
                rank the world&rsquo;s news for you.
              </li>
              <li>
                <strong>It is not advice.</strong> Nothing here is investment, legal or trading
                advice, and headlines are not a recommendation about any asset.
              </li>
            </ul>

            <h2>4. Use without an account</h2>
            <p>
              Every read endpoint is public. Anonymous callers are limited to 120 requests a minute,
              identified by calling address — hashed and never stored in the clear.
            </p>

            <h2>5. Keys, trial and metering</h2>
            <p>
              A key is optional. It raises the limit to 1,200 requests a minute and is{" "}
              <strong>metered</strong>: each call is charged against a balance. When the balance
              reaches zero the key returns <code>402</code> and you fall back to the free anonymous
              tier.
            </p>
            <p>
              A new key starts with <strong>$5.00 of trial credit</strong>. That is a grant, not a
              payment, and it is not a plan. <strong>Prepaid access starts at $6</strong> — 30 days at
              $0.20 a day — with $18 for 90 days and $60 for 300 days. The schedule on{" "}
              <a href="/pricing">the pricing page</a> prevails over this summary if the two differ.
            </p>
            <p>
              Keys are self-served through GitHub, requesting the <code>read:user</code> scope only.
              The key is shown once; only a hash is stored, so we cannot recover it. Signing in again
              rotates it and revokes the previous one.
            </p>
            <p>
              You are responsible for keeping your key secret and for activity under it. Tell us at
              once if it is exposed.
            </p>

            <h2>6. Publisher rights</h2>
            <p>
              Headlines and the articles they lead to belong to their publishers. We link to them; we
              do not license them and cannot grant you rights in them. If you display a headline,
              name the publisher and link to the article as returned. Whether your own use — including
              processing by an AI system — is permitted is a question for you and, where the law is
              unsettled, for a lawyer.
            </p>

            <h2>7. Acceptable use</h2>
            <p>You may build products on this service. You may not:</p>
            <ul>
              <li>redistribute the API responses as a dataset, feed or bulk export;</li>
              <li>
                offer a service that substantially reproduces this one — a competing news API or
                media-monitoring platform built on reselling our output;
              </li>
              <li>republish article text or images, which we do not supply and cannot license;</li>
              <li>
                evade the rate limits, or mint keys to do so — including automated self-serve
                sign-ups;
              </li>
              <li>use the service to break the law, or to build something that does.</li>
            </ul>

            <h2>8. Availability</h2>
            <p>
              The service is provided as it is. It is refreshed on a fifteen-minute schedule and we
              aim to keep it available, but no uptime commitment is made and none should be assumed.
              Each topic reports its own <code>freshness</code>; a check can fail, and the field says
              so rather than pretending otherwise.
            </p>

            <h2>9. Changes, suspension and ending</h2>
            <p>
              We may change, suspend or withdraw any part of the service. Material changes to these
              terms will be reflected in the date at the top of this page. You may stop using the
              service at any time; we may suspend a key that breaches section 7 or stops paying.
            </p>
            <p>
              Sections 6, 10 and 11 survive the end of your use.
            </p>

            <h2>10. Liability</h2>
            <p>
              To the extent the law allows, we are not liable for indirect or consequential loss, or
              for lost profit, revenue, data or opportunity, arising from your use of the service.
              Our total liability is limited to the greater of the amount you paid us in the twelve
              months before the claim, or $100. Nothing here excludes liability that cannot lawfully
              be excluded.
            </p>

            <h2>11. Governing law</h2>
            <p>
              These terms are governed by the laws of the <strong>Republic of Slovenia</strong>, and
              the courts of <strong>Ljubljana, Slovenia</strong> have exclusive jurisdiction, without
              affecting any right you have under mandatory consumer law where you live.
            </p>

            <h2>12. Contact</h2>
            <p>
              Questions about these terms, or a deal that needs a different one:{" "}
              <a href="mailto:hello@newsbeat.dev">hello@newsbeat.dev</a>.
            </p>

            <div className="docs-nav-foot">
              <a href="/legal/cookies">Cookie notice →</a>
              <a href="/pricing">Pricing</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
