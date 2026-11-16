import type { ReactNode } from "react";
import {
  Activity, ArrowUpRight, ChartNoAxesCombined, ChevronDown, Coins,
  LayoutDashboard, ListFilter, MessageSquareText, Newspaper, Search, Unplug,
} from "lucide-react";
import SiteNav from "./site-nav";
import SiteFooter from "./site-footer";
import BrandMark from "./brand-mark";
import "./workspace-shell.css";

const GROUPS = [
  {
    label: "Markets",
    links: [
      { href: "/app", label: "Markets", icon: LayoutDashboard },
      { href: "/intelligence", label: "Market checks", icon: ListFilter },
      { href: "/app/forecasts", label: "Forecasts", icon: ChartNoAxesCombined },
      { href: "/crypto", label: "Indicators", icon: Activity },
    ],
  },
  {
    label: "Research",
    links: [
      { href: "/ask", label: "Ticker research", icon: Search },
      { href: "/app/research", label: "Ask a question", icon: MessageSquareText },
      { href: "/tokens", label: "Token contracts", icon: Coins },
      { href: "/dashboard", label: "News map", icon: Newspaper },
    ],
  },
] as const;

type WorkspacePath = (typeof GROUPS)[number]["links"][number]["href"];

export default function WorkspaceShell({ active, title, description, children }: {
  active: WorkspacePath;
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return <>
    <SiteNav active={active} />
    <div className="rb-app">
      <a className="rb-app-skip" href="#workspace-content">Skip to workspace content</a>
      <nav className="rb-app-nav" aria-label="Rarebird workspace">
        <a className="rb-app-symbol" href="/app" aria-label="Rarebird markets"><BrandMark size={26} /></a>
        {GROUPS.map(group => (
          <div key={group.label} className="rb-app-nav-group" role="group" aria-label={group.label}>
            {group.links.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} aria-current={href === active ? "page" : undefined}>
                <Icon size={15} aria-hidden="true" />
                {label}
              </a>
            ))}
          </div>
        ))}
        <a className="rb-app-agent-link" href="/docs/quickstart">
          <Unplug size={15} aria-hidden="true" />
          Connect an agent
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </nav>
      <main className="rb-app-main" id="workspace-content">
        {title && <header className="rb-app-heading">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>}
        {children}
      </main>
    </div>
    <SiteFooter />
  </>;
}

export function WorkspaceEvidence({ title, children }: { title: string; children: ReactNode }) {
  return <details className="rb-app-evidence">
    <summary>{title}<ChevronDown size={16} aria-hidden="true" /></summary>
    <div>{children}</div>
  </details>;
}
