import { Annotation } from "@langchain/langgraph";
import type { Retrieval, Citation } from "../shared/types";

export const GraphStateAnnotation = Annotation.Root({
  query: Annotation<string>,
  // Candidate pool. Append reducer so retrieve and citation-follow can both
  // contribute without overwriting each other.
  retrievals: Annotation<Retrieval[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // Final ordering after the rerank node runs. Default replace reducer.
  // Generate (and the eval scorer) read from here. If rerank is skipped or
  // fails, this stays undefined and downstream callers fall back to
  // `retrievals` in candidate-pool order.
  rankedRetrievals: Annotation<Retrieval[] | undefined>,
  answer: Annotation<string | undefined>,
  citations: Annotation<Citation[] | undefined>,
});

export type GraphState = typeof GraphStateAnnotation.State;
