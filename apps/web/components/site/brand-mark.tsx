/** Black Sheep's original monochrome mark, shared across the website. */
export default function BrandMark({ className, size = 64 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0b0b0b" />
      <path d="M16 28a9 9 0 0 1 2-16 10 10 0 0 1 16-3 9 9 0 0 1 14 6 8 8 0 0 1 0 16H18Z" fill="#f3f1eb" />
      <path d="M21 26 9 24c0 8 5 12 12 11m22-9 12-2c0 8-5 12-12 11" fill="#f3f1eb" />
      <path d="M20 25c0-5 24-5 24 0v13c0 10-5 17-12 17s-12-7-12-17Z" fill="#0b0b0b" stroke="#f3f1eb" strokeWidth="1.5" />
      <path d="m26 36 3 1m9-1-3 1" stroke="#f3f1eb" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m30 46 2 1 2-1" stroke="#f3f1eb" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
