"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { API_BASE } from "./content";
import { chooseSearchResult, findAssets, type LookupAsset } from "./landing-lookup-data";
import "./catalog-search.css";

type SearchResult = { term: string; phase: "ready"; topics: LookupAsset[] } | { term: string; phase: "error" };

export default function CatalogSearch({ id, className, onSelect }: {
  id: string;
  className?: string;
  onSelect: (asset: LookupAsset) => void;
}) {
  const menu = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [retry, setRetry] = useState(0);
  const term = query.trim();
  const result = search?.term === term ? search : null;
  const topics = result?.phase === "ready" ? result.topics : [];
  const expanded = open && Boolean(term);
  const optionId = (topic: LookupAsset) => menu + "-" + topic.beat_id;

  useEffect(() => {
    if (!term || !open) return;
    const request = new AbortController();
    let active = true;
    let timeout: number | undefined;
    const debounce = window.setTimeout(() => {
      timeout = window.setTimeout(() => request.abort(), 8_000);
      void findAssets(API_BASE, term, request.signal)
        .then(topics => { if (active) setSearch({ term, phase: "ready", topics }); })
        .catch(() => { if (active) setSearch({ term, phase: "error" }); })
        .finally(() => window.clearTimeout(timeout));
    }, 200);
    return () => {
      active = false;
      request.abort();
      window.clearTimeout(debounce);
      window.clearTimeout(timeout);
    };
  }, [open, term, retry]);

  function choose(topic: LookupAsset) {
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) input.current?.blur();
    else input.current?.focus();
    setQuery("");
    setOpen(false);
    setIndex(-1);
    onSelect(topic);
  }

  return <form className={"rb-catalog-search" + (className ? " " + className : "")} role="search"
    aria-label="Search by ticker or company"
    onBlur={event => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      setOpen(false);
      setIndex(-1);
    }}
    onSubmit={event => {
      event.preventDefault();
      const topic = chooseSearchResult(topics, term, expanded ? index : -1);
      if (topic) choose(topic);
      else {
        setOpen(true);
        if (result?.phase === "error") {
          setSearch(null);
          setRetry(value => value + 1);
        }
      }
    }}>
    <div className="catalog-search-field">
      <Search size={17} aria-hidden="true" />
      <input ref={input} id={id} type="text" role="combobox" aria-label="Search ticker or company"
        aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? menu : undefined}
        aria-activedescendant={expanded && topics[index] ? optionId(topics[index]) : undefined}
        placeholder="Search ticker or company" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={80} enterKeyHint="search"
        value={query} onFocus={() => setOpen(true)}
        onChange={event => { setQuery(event.target.value); setOpen(true); setIndex(-1); }}
        onKeyDown={event => {
          if (event.key === "Escape" && expanded) {
            event.preventDefault();
            setOpen(false);
            setIndex(-1);
          }
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && topics.length) {
            event.preventDefault();
            setOpen(true);
            setIndex(value => event.key === "ArrowDown" ? (value + 1) % topics.length : value <= 0 ? topics.length - 1 : value - 1);
          }
        }} />
      {query && <button className="catalog-search-clear" type="button" aria-label="Clear search"
        onClick={() => { setQuery(""); setIndex(-1); setOpen(false); input.current?.focus(); }}><X size={15} aria-hidden="true" /></button>}
    </div>
    {expanded && <div className="catalog-search-menu" data-lenis-prevent>
      <ul id={menu} role="listbox" aria-label="Matching stocks and crypto">
        {topics.map((topic, position) => <li key={topic.beat_id} id={optionId(topic)} role="option" aria-selected={position === index}
          onPointerDown={event => event.preventDefault()} onClick={() => choose(topic)}>
          <span><strong>{topic.label}</strong><small>{topic.asset === "crypto" ? "Crypto" : "Stock"}</small></span>
          <span>{topic.ticker}<ArrowRight size={14} aria-hidden="true" /></span>
        </li>)}
      </ul>
      {!topics.length && <p role="status">
        {!result ? "Finding matches…" : result.phase === "error" ? "Search unavailable. Press Enter to retry." : "No matching stock or crypto asset."}
      </p>}
    </div>}
  </form>;
}
