import type { Metadata } from "next";

const TITLE = "NewsBeat — Research workspace";
const DESCRIPTION = "Investigate reported developments, conditional implications and source evidence in the NewsBeat intelligence pilot.";

// Keep the interactive workspace accessible while indexing the product pages.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.newsbeat.dev/dashboard" },
  robots: { index: false, follow: true },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://www.newsbeat.dev/dashboard" },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
