"use client";

import { useState } from "react";

export function CitationChip({
  n,
  excerpt,
  onActivate,
}: {
  n: number;
  excerpt?: string;
  onActivate?: (n: number) => void;
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false);
  const text = excerpt ? truncate(excerpt, 400) : null;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => onActivate?.(n)}
        aria-label={`Open citation ${n}`}
        className="mx-[2px] inline-flex h-5 min-w-[22px] -translate-y-[1px] cursor-pointer items-center justify-center rounded-full bg-[#dfeee3] px-1.5 font-mono text-[11px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40 transition-all hover:bg-[#c4e0cd] hover:ring-[#9cc9a9]"
      >
        {n}
      </button>
      {hovered && text && (
        <span
          role="tooltip"
          className="tooltip-in pointer-events-none absolute bottom-full left-1/2 z-30 w-[320px] -translate-x-1/2 -translate-y-2 rounded-xl bg-[#1f2a23] px-3.5 py-2.5 text-[12px] leading-relaxed text-white/95 shadow-[0_12px_32px_-8px_rgba(31,42,35,0.4)]"
        >
          <span className="mb-1 block text-[9px] uppercase tracking-[0.18em] text-white/55">
            Citation {n}
          </span>
          {text}
          <span
            aria-hidden
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1f2a23]"
          />
        </span>
      )}
    </span>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}
