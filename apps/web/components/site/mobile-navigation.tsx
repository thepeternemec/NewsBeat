"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import ThemeToggle from "./theme-toggle";

type NavigationLink = { href: string; label: string; description: string };

/** Native modal behavior keeps focus and scrolling inside the mobile menu. */
export default function MobileNavigation({ links, active }: { links: NavigationLink[]; active?: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const inTerminal = active === "/dashboard";

  useEffect(() => {
    const panel = dialog.current;
    if (!open || !panel) return;
    const desktop = window.matchMedia("(min-width: 701px)");
    if (desktop.matches) { setOpen(false); return; }
    const previousOverflow = document.body.style.overflow;
    panel.showModal();
    document.body.style.overflow = "hidden";
    const onResize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", onResize);
    return () => {
      desktop.removeEventListener("change", onResize);
      document.body.style.overflow = previousOverflow;
      panel.close();
      if (!desktop.matches) trigger.current?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <>
      <button ref={trigger} type="button" className="nav-menu-toggle" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}><Menu size={20} aria-hidden="true" /></button>
      <dialog ref={dialog} id={id} className="mobile-nav-dialog" aria-labelledby={id + "-title"} data-lenis-prevent onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="mobile-nav-panel">
          <div className="mobile-nav-heading">
            <a className="nav-logo" href="/" onClick={() => setOpen(false)}>BLACK SHEEP</a>
            <h2 id={id + "-title"} className="mobile-nav-title">Navigation</h2>
            <button type="button" className="nav-menu-close" aria-label="Close navigation menu" onClick={() => setOpen(false)} autoFocus><X size={20} aria-hidden="true" /></button>
          </div>
          <nav className="mobile-nav-links" aria-label="Mobile navigation">
            {links.map(link => (
              <a key={link.href} href={link.href} aria-current={active === link.href ? "page" : undefined} onClick={() => setOpen(false)}>
                <span><strong>{link.label}</strong><span>{link.description}</span></span><ArrowRight size={16} aria-hidden="true" />
              </a>
            ))}
          </nav>
          <div className="mobile-nav-bottom">
            <a className="mobile-nav-primary" href={inTerminal ? "/docs/quickstart" : "/docs/try"} onClick={() => setOpen(false)}>{inTerminal ? "Connect your agent" : "Try Black Sheep free"}<ArrowRight size={16} aria-hidden="true" /></a>
            <div className="mobile-nav-appearance"><span>Appearance</span><ThemeToggle /></div>
          </div>
        </div>
      </dialog>
    </>
  );
}
