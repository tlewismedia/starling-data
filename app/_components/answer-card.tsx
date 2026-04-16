import { useMemo } from "react";
import type { Citation, Retrieval } from "../../shared/types";
import { Card } from "./card";
import {
  SERIF,
  type ConfidenceTier,
  parseAnswerParts,
} from "./shared";
import { CitationChip } from "./citation-chip";
import { SourcesRow } from "./sources-row";

export function AnswerCard({
  answer,
  citations,
  retrievals,
  tier,
}: {
  answer: string;
  citations: readonly Citation[];
  retrievals: readonly Retrieval[];
  tier: ConfidenceTier;
}): React.JSX.Element {
  const parts = useMemo(() => parseAnswerParts(answer), [answer]);

  return (
    <Card
      className="relative overflow-hidden p-7"
      data-testid="answer"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(253,228,212,0.7) 0%, rgba(253,228,212,0) 70%)",
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <label className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          Answer
        </label>
        <ConfidenceBadge tier={tier} />
      </div>

      <p className="mt-4 whitespace-pre-wrap text-[15.5px] leading-[1.75] text-[#26302a]">
        {parts.map((part, i) =>
          part.kind === "text" ? (
            <span key={i}>{part.text}</span>
          ) : (
            <CitationChip key={i} n={part.n} />
          ),
        )}
      </p>

      {citations.length > 0 && (
        <SourcesRow citations={citations} retrievals={retrievals} />
      )}
    </Card>
  );
}

function ConfidenceBadge({
  tier,
}: {
  tier: ConfidenceTier;
}): React.JSX.Element {
  const isPeach = tier === "HIGH" || tier === "MEDIUM";
  const label =
    tier === "HIGH" ? "High" : tier === "MEDIUM" ? "Medium" : "Low";

  if (isPeach) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#fde4d4]/70 px-3.5 py-2 ring-1 ring-[#fab89a]/40">
        <div className="flex flex-col items-end leading-none">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#8b4a2f]">
            Confidence
          </span>
          <span
            className="mt-1 text-[18px] leading-none tracking-tight text-[#6b2d0e]"
            style={SERIF}
          >
            {label}
          </span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-[#fab89a]/50">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3.5 7L6 9.5L10.5 4.5"
              stroke="#8b4a2f"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#dfeee3]/70 px-3.5 py-2 ring-1 ring-[#9cc9a9]/40">
      <div className="flex flex-col items-end leading-none">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#2d4a35]/70">
          Confidence
        </span>
        <span
          className="mt-1 text-[18px] leading-none tracking-tight text-[#2d4a35]"
          style={SERIF}
        >
          {label}
        </span>
      </div>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-[#9cc9a9]/50">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 3.5V7.5M7 10V10.2"
            stroke="#2d4a35"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

