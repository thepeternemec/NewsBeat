/** Shared NewsBeat mark: keep geometry and colors identical on every surface. */
export default function BrandMark({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="10" fill="#000000" />
      <g fill="#ffffff">
        <rect x="15" y="26" width="8" height="16" rx="4" />
        <rect x="28" y="16" width="8" height="34" rx="4" />
        <rect x="41" y="22" width="8" height="22" rx="4" />
      </g>
    </svg>
  );
}
