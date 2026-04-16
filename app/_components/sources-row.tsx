import type { Citation, Retrieval } from "../../shared/types";
import {
  citationMarkerNumber,
  findRetrievalForCitation,
  authorityStyle,
} from "./shared";

export function SourcesRow({
  citations,
  retrievals,
}: {
  citations: readonly Citation[];
  retrievals: readonly Retrieval[];
}): React.JSX.Element {
  return (
    <div className="mt-6" data-testid="sources-row">
      <div className="flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          Sources
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[#9cc9a9]/40 to-transparent" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {citations.map((c) => {
          const retrieval = findRetrievalForCitation(c, retrievals);
          const a = authorityStyle(retrieval?.metadata?.authority);
          const display =
            retrieval?.metadata?.citationIdDisplay ||
            retrieval?.metadata?.citationId ||
            c.chunkId;
          const n = citationMarkerNumber(c.marker);
          return (
            <span
              key={c.chunkId}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${a.chip}`}
            >
              {n !== null && (
                <span className="font-mono text-[10px] opacity-70">
                  [{n}]
                </span>
              )}
              <span className="font-semibold">{a.label}</span>
              <span className="opacity-75">{display}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
