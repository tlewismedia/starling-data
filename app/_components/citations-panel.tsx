import type { QueryResponse } from "../../shared/types";
import { CitationCard } from "./citation-card";
import { LeafMark } from "./leaf-mark";
import {
  SERIF,
  findRetrievalForCitation,
} from "./shared";

export function CitationsPanel({
  result,
}: {
  result: QueryResponse | null;
}): React.JSX.Element {
  if (!result) {
    return (
      <div className="lg:sticky lg:top-8" data-testid="citations-empty">
        <div className="flex items-end justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[20px] tracking-tight text-[#1f2a23]"
              style={SERIF}
            >
              Citations
            </span>
          </div>
        </div>
        <div
          className={`mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#9cc9a9]/50 bg-white/40 px-6 py-10 text-center backdrop-blur-md`}
        >
          <LeafMark size={26} />
          <p className="mt-3 max-w-[220px] text-[12.5px] leading-relaxed text-[#6b7a70]">
            Citations will appear here once you ask a question.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:sticky lg:top-8" data-testid="citations">
      <div className="flex items-end justify-between px-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[20px] tracking-tight text-[#1f2a23]"
            style={SERIF}
          >
            Citations
          </span>
          <span className="text-[12px] text-[#6b7a70]">
            ({result.citations.length})
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a968f]">
          Grounded
        </span>
      </div>
      <div className="space-y-3">
        {result.citations.map((c) => {
          const retrieval = findRetrievalForCitation(c, result.retrievals);
          return (
            <CitationCard
              key={c.chunkId}
              citation={c}
              retrieval={retrieval}
            />
          );
        })}
        {result.citations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#9cc9a9]/50 bg-white/40 px-5 py-6 text-[12.5px] text-[#6b7a70] backdrop-blur-md">
            The model returned no inline citations for this answer.
          </div>
        )}
      </div>
    </div>
  );
}

