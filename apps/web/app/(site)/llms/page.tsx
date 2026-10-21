import InteriorPage from "@/components/site/interior-page";
import PageVisual from "@/components/site/page-visual";
import fs from "node:fs/promises";
import path from "node:path";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import CopyButton from "@/components/site/copy-button";

export const metadata = { title: "llms.txt" };

/**
 * llms.txt, for a human.
 *
 * `/llms.txt` is a plain text file — correctly so, because a machine fetches it and
 * prose styling would be noise. But linking to it from the footer opened raw text in
 * the browser, which looks like a broken page rather than a deliverable. This renders
 * the same file, styled, with a copy button, and says what it is for.
 *
 * The file is read at build time rather than imported, so it cannot drift from the
 * text that is actually served at the URL.
 */
export default async function Llms() {
  const file = path.join(process.cwd(), "public", "llms.txt");
  const body = await fs.readFile(file, "utf8");

  return (
    <>
      <SiteNav active="/docs" />
      <InteriorPage className="llms-page">
        <div className="page-head">
          <div className="wrap intro-grid">
            <div className="intro-copy">
            <span className="sec-eyebrow">For machines, readable by people</span>
            <h1 className="sec-title">llms.txt</h1>
            <p className="sec-sub">
              One page an agent can fetch to learn what this service is, how the loop works, and
              what it must not claim. It is served as plain text at{" "}
              <a href="/llms.txt">/llms.txt</a> — this is the same file, rendered.
            </p>
            </div>
            <PageVisual kind="reference" />
          </div>
        </div>

        <section className="scaffold">
          <div className="wrap-tight">
            <div className="code">
              <div className="code-bar">
                <span>llms.txt</span>
                <span style={{ marginLeft: "auto" }}>
                  <CopyButton text={body} label="llms.txt" />
                </span>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{body}</pre>
            </div>

            <p className="hero-tiny" style={{ marginTop: 22 }}>
              Also available: <a href="/skill.md">skill.md</a> for step-by-step agent instructions ·{" "}
              <a href="/auth.md">auth.md</a> for the registration question (there is nothing to
              register) · <a href="/api/v2/tools">tool definitions</a> as JSON Schema.
            </p>
          </div>
        </section>
      </InteriorPage>
      <SiteFooter />
    </>
  );
}
