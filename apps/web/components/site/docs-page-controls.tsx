"use client";

import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { DOC_PAGES } from "./docs-links";

export function DocsBreadcrumb() {
  const pathname = usePathname();
  const page = DOC_PAGES.find(page => page.href === pathname);
  return (
    <nav className="docs-breadcrumb" aria-label="Breadcrumb">
      <a href="/docs">Docs</a>
      <ChevronRight size={12} aria-hidden="true" />
      <span aria-current="page">{page?.label ?? "Documentation"}</span>
    </nav>
  );
}

export function DocsPagination() {
  const pathname = usePathname();
  const index = DOC_PAGES.findIndex(page => page.href === pathname);
  if (index < 0) return null;
  const previous = DOC_PAGES[index - 1];
  const next = DOC_PAGES[index + 1];
  return (
    <nav className="docs-pagination" aria-label="More documentation">
      {previous && <a href={previous.href}>
        <span className="docs-pagination-direction"><ArrowLeft size={14} aria-hidden="true" /> Previous</span>
        <strong>{previous.label}</strong>
        <span>{previous.description}</span>
      </a>}
      {next && <a href={next.href} className="docs-pagination-next">
        <span className="docs-pagination-direction">Next <ArrowRight size={14} aria-hidden="true" /></span>
        <strong>{next.label}</strong>
        <span>{next.description}</span>
      </a>}
    </nav>
  );
}
