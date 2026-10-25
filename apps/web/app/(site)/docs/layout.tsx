import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import DocsSide from "@/components/site/docs-side";
import DocsContents from "@/components/site/docs-contents";
import InteriorPage from "@/components/site/interior-page";
import { DocsBreadcrumb, DocsPagination } from "@/components/site/docs-page-controls";
import "@/components/site/docs-navigation.css";
import "./docs.css";

export const metadata = {
  title: "Documentation",
  description:
    "Ask your assistant about company and crypto news. Plain-language setup, example questions, and a technical reference for developers."
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav active="/docs" />
      <InteriorPage className="documentation-page">
        <div className="wrap">
          <div className="docs">
            <DocsSide />
            <DocsContents />
            <article className="docs-body" id="docs-content" tabIndex={-1}>
              <DocsBreadcrumb />
              {children}
              <DocsPagination />
            </article>
          </div>
        </div>
      </InteriorPage>
      <SiteFooter />
    </>
  );
}
