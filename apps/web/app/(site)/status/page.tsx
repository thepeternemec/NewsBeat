import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import StatusBoard from "@/components/site/status-board";
import "./status.css";

export const metadata = {
  title: "Black Sheep service status",
  description:
    "Operational checks for the Black Sheep news API, MCP connection and news collection, with a public status feed.",
  alternates: {
    types: {
      "application/atom+xml": "https://www.newsbeat.dev/api/status/feed",
    },
  },
};

export default function StatusPage() {
  return (
    <>
      <SiteNav active="/status" />
      <main className="status-page">
        <div className="wrap">
          <header className="status-heading">
            <div>
              <span className="sec-eyebrow">Black Sheep operations</span>
              <h1>Know where things stand.</h1>
              <p>
                Checks for the working news engine. Agent messaging and the Black Sheep token are planned, not live.
              </p>
            </div>
            <a className="btn-ghost" href="/api/status/feed">
              Subscribe to status feed <span aria-hidden="true">↗</span>
            </a>
          </header>
          <noscript>
            <p>
              Enable JavaScript to view service checks here, or open the{" "}
              <a href="/api/status">JSON status</a> or{" "}
              <a href="/api/status/feed">status feed</a>.
            </p>
          </noscript>
          <StatusBoard />
          <section className="status-explainer">
            <div>
              <h2>What these checks mean</h2>
              <p>
                Every five minutes, Black Sheep tests a news API request and an MCP
                news lookup, then checks the last successful collection time for
                every supported topic.
              </p>
            </div>
            <div>
              <h2>Freshness, clearly stated</h2>
              <p>
                A topic is fresh when its last successful check falls within its
                configured refresh window. A successful check can return no
                headlines. Delayed collection is shown separately from
                connection failures.
              </p>
            </div>
            <div>
              <h2>A record from here forward</h2>
              <p>
                The feed contains automated check results, with up to four hours
                shown here. Missing or old checks mean status is unknown.
                Monitoring runs on Black Sheep’s infrastructure and cannot
                independently verify a complete hosting outage.
              </p>
            </div>
          </section>
          <div className="status-contact">
            <span>Something looks wrong?</span>
            <a href="mailto:contact@newsbeat.dev">
              contact@newsbeat.dev <span aria-hidden="true">↗</span>
            </a>
            <a href="/api/status">
              JSON status <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
