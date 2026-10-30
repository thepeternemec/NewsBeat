import BrandMark from "./brand-mark";

export default function SheepBadge({ compact = false }: { compact?: boolean }) {
  return <a className={"sheep-community-badge" + (compact ? " is-compact" : "")} href="/#sheep-community" aria-label="$SHEEP — Black Sheep community">
    <BrandMark size={compact ? 44 : 56} />
    <span><strong>$SHEEP</strong><small>BLACK SHEEP COMMUNITY</small></span>
    <span className="sheep-badge-arrow" aria-hidden="true">↗</span>
  </a>;
}
