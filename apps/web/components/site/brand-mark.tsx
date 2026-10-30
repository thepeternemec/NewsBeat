/** Original vector mascot: black wool, a raised eyebrow and a knowing smile. */
export default function BrandMark({ className, size = 64, variant = "portrait" }: { className?: string; size?: number; variant?: "portrait" | "mascot" }) {
  const full = variant === "mascot";
  return (
    <svg className={className} width={size} height={full ? size * 460 / 320 : size} viewBox={full ? "0 0 320 460" : "0 0 320 280"} fill="none" aria-hidden="true" focusable="false">
      {full ? (<g stroke="#f3f2ec" strokeWidth="5" strokeLinejoin="round">
  <path d="m107 373-7 55-25 9c-8 3-7 13 2 13h61l2-74m46-1 2 74h60c10 0 10-10 2-13l-26-9-9-53" fill="#151714" />
  <path d="M80 247c-23 0-38 24-28 44-22 13-22 45 1 57-9 25 8 49 33 49 9 27 39 36 59 19 19 24 49 19 61-4 27 10 52-9 51-35 27-5 38-34 21-55 16-22 3-51-23-56-6-25-30-40-53-29Z" fill="#101210" />
  <path d="M91 340q-6 18 7 28m119-24q10 18-4 31m-69 3q13 11 25 1" fill="none" stroke="#343832" strokeWidth="6" strokeLinecap="round" />
</g>) : null}
      <g stroke="#f3f2ec" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
  <path d="M83 114C55 107 23 134 16 164c-6 25 18 34 40 23l35-29" fill="#111312" />
  <path d="M238 111c30-1 59 24 66 52 7 26-14 37-37 25l-35-29" fill="#111312" />
  <path d="M38 163q13-23 33-26m210 28q-12-24-29-28" fill="none" stroke="#575b56" strokeWidth="9" />
  <path d="M91 100c-9 30-12 77 8 108 16 25 41 42 65 42 28 0 57-21 70-48 15-32 9-72-3-103Z" fill="#292c28" />
  <path d="M64 109c-23-11-23-42 0-54 0-22 20-40 42-34 12-23 43-25 60-7 24-17 54-6 61 17 24-2 42 16 40 38 23 16 17 48-7 55-8 22-36 28-53 13-16 18-43 17-58 2-20 17-46 11-55-8-14 6-28-3-30-22Z" fill="#101210" />
  <path d="M102 45c8-10 21-10 29-3m58 0c8-3 18 1 21 8" fill="none" stroke="#343832" strokeWidth="6" />
</g>
<ellipse cx="132" cy="166" rx="26" ry="30" fill="#f8f7f0" />
<ellipse cx="193" cy="160" rx="28" ry="31" fill="#f8f7f0" />
<ellipse cx="143" cy="165" rx="10" ry="13" fill="#111312" />
<ellipse cx="204" cy="159" rx="10" ry="13" fill="#111312" />
<circle cx="146" cy="161" r="3" fill="#f8f7f0" />
<circle cx="207" cy="155" r="3" fill="#f8f7f0" />
<path d="M108 143q23-9 46 3" fill="none" stroke="#292c28" strokeWidth="10" strokeLinecap="round" />
<path d="M177 119q17-9 31-1" fill="none" stroke="#f3f2ec" strokeWidth="5" strokeLinecap="round" />
<path d="M145 211q23 19 48-8m-3 0 10-1" fill="none" stroke="#f3f2ec" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
