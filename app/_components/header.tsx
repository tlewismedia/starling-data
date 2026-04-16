import { SERIF } from "./shared";

export function Header(): React.JSX.Element {
  const indexName =
    process.env.NEXT_PUBLIC_PINECONE_INDEX ?? "compliance-copilot";
  return (
    <header className="relative mx-auto flex max-w-[1360px] items-center justify-between px-8 pt-8">
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(45,74,53,0.12)] ring-1 ring-[#9cc9a9]/30">
          <LeafMark />
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-[19px] tracking-tight text-[#1f2a23]"
            style={SERIF}
          >
            Compliance Copilot
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#6b7a70]">
            Grounded · Cited · Auditable
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[11px] text-[#435048] ring-1 ring-[#9cc9a9]/25 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#9cc9a9] opacity-70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#6ea580]" />
          </span>
          Index: {indexName}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[11px] font-medium text-[#435048] ring-1 ring-[#9cc9a9]/25 backdrop-blur-md">
          TL
        </div>
      </div>
    </header>
  );
}

export function LeafMark({
  size = 18,
}: {
  size?: number;
}): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M3 14.5C3 9 7 4 13.5 3.5C14 8 11 13.5 6 14.5C5 14.7 4 14.7 3 14.5Z"
        fill="#9cc9a9"
      />
      <path
        d="M3 14.5L11 6.5"
        stroke="#2d4a35"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
