import type { Metadata } from "next";
import WorkspaceShell, { WorkspaceEvidence } from "@/components/site/workspace-shell";

const TITLE = "News map | Rarebird";
const DESCRIPTION = "Explore the reporting behind an asset, read the original sources and check when Rarebird last collected the feed.";

// Keep the interactive workspace accessible while indexing the product pages.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.rarebird.network/dashboard" },
  robots: { index: false, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.rarebird.network/dashboard" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function NewsMapLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell active="/dashboard" title="News map" description={DESCRIPTION}>
    <WorkspaceEvidence title="How to read the news map">
      <p>Use News map to follow recent reporting for one asset, or Stories by asset to browse the catalog. The collection time shows when Rarebird last received an update.</p>
      <a href="/intelligence#discovery">See which developments passed the discovery checks</a>
    </WorkspaceEvidence>
    {children}
  </WorkspaceShell>;
}
