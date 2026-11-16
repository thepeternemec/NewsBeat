import type { ReactNode } from "react";
import {
  Activity, ArrowUpRight, ChartNoAxesCombined, ChevronDown, Coins,
  LayoutDashboard, ListFilter, MessageSquareText, Newspaper, Search, Unplug,
} from "lucide-react";
import SiteNav from "./site-nav";
import SiteFooter from "./site-footer";
import "./workspace-shell.css";

const GROUPS = [
  {
    label: "Markets",
    links: [
      { href: "/app", label: "Overview", icon: LayoutDashboard },
      { href: "/intelligence", label: "Market checks", icon: ListFilter },
      { href: "/app/forecasts", label: "Forecasts", icon: ChartNoAxesCombined },
      { href: "/crypto", label: "Crypto markets", icon: Activity },
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
  title: string;
  description: string;
  children: ReactNode;
}) {
  return <>
    <SiteNav active={active} />
    <div className="rb-app">
      <a className="rb-app-skip" href="#workspace-content">Skip to workspace content</a>
      <aside className="rb-app-sidebar">
        <nav className="rb-app-nav" aria-label="Rarebird workspace">
          {GROUPS.map(group => (
            <div key={group.label} className="rb-app-nav-group">
              <p>{group.label}</p>
              {group.links.map(({ href, label, icon: Icon }) => (
                <a key={href} href={href} aria-current={href === active ? "page" : undefined}>
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </a>
              ))}
            </div>
          ))}
          <a className="rb-app-agent-link" href="/docs/quickstart">
            <Unplug size={16} aria-hidden="true" />
            Connect an agent
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </nav>
      </aside>
      <main className="rb-app-main" id="workspace-content">
        <header className="rb-app-heading">
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
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
