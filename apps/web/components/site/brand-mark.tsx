/**
 * The NewsBeat mark: three bars in a rounded tile — a beat, read as an equalizer.
 *
 * This is the original mark, restored. It replaced a sheep mascot during a rename that
 * was reverted, and the mascot-free version is better on every surface: it is legible at
 * 16px in a browser tab, it does not need a light or dark variant because the tile
 * supplies its own contrast, and it reads as a beat rather than as a character.
 *
 * Flat fills only, no strokes, so it renders identically at 16px and at 1024px.
 */
export default function BrandMark({
  className,
  size = 64,
}: {
  className?: string;
  size?: number;
  /** Accepted for callers that still pass it; the mark has a single form now. */
  variant?: "portrait" | "mascot";
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="10" fill="#000000" />
      <g fill="#ffffff">
        <rect x="15" y="26" width="8" height="16" rx="4" />
        <rect x="28" y="16" width="8" height="34" rx="4" />
        <rect x="41" y="22" width="8" height="22" rx="4" />
      </g>
    </svg>
  );
}
