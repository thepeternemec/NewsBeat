import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import DocsSide from "@/components/site/docs-side";

export const metadata = {
  title: "Documentation",
  description:
    "Ask your assistant about company and crypto news. Plain-language setup, example questions, and a technical reference for developers."
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav active="/docs" />
      <main>
        <div className="wrap">
          <div className="docs">
            <DocsSide />
            <article className="docs-body">{children}</article>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
