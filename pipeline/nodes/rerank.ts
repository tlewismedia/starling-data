/**
 * Cross-encoder rerank node.
 *
 * Reads the candidate pool produced by retrieve + citation-follow, sends it
 * to Pinecone's hosted cross-encoder rerank API, and writes the reordered
 * top-N back to `state.rankedRetrievals`. Generate and the eval scorer read
 * from `rankedRetrievals` (with a fallback to `retrievals` when this node
 * is skipped or its API call fails).
 *
 * Why a separate channel: `state.retrievals` uses an append reducer so the
 * citation-follow node can add to retrieve's output. Rerank needs to *replace*
 * with a reordered subset — so it writes to a sibling channel with default
 * (replace) reducer semantics. See pipeline/state.ts.
 *
 * Failure handling: a rerank-API failure must not block the query. The node
 * logs and returns `{}`, leaving `rankedRetrievals` unset; downstream code
 * falls back to the unranked candidate pool. Better a slightly worse answer
 * than no answer.
 */
import { Pinecone } from "@pinecone-database/pinecone";
import type { GraphState } from "../state";
import { logMemory } from "../instrument";

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

// Cross-encoder model. `bge-reranker-v2-m3` is open-source, included in
// Pinecone's hosted inference. `cohere-rerank-3.5` is the higher-quality
// option if benchmarks justify the extra cost.
export const RERANK_MODEL = "bge-reranker-v2-m3";

// Cap on chunks passed downstream after reranking. Keeps the generate
// prompt bounded; eval scores top-RETRIEVAL_K (currently 10) so this also
// matches the eval horizon.
export const RERANK_TOP_N = 10;

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

export function createRerankNode(pinecone: Pinecone) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const candidates = state.retrievals;

    // Nothing useful to rerank — pass through (and let the downstream
    // fallback read state.retrievals directly).
    if (candidates.length <= 1) {
      return { rankedRetrievals: candidates };
    }

    const t0 = Date.now();
    try {
      const response = await pinecone.inference.rerank({
        model: RERANK_MODEL,
        query: state.query,
        // Plain-string form keeps the request small. The response's
        // `index` field maps each result back to this array's position,
        // so we never need to round-trip the chunk text — we reorder
        // the original Retrieval objects (preserving metadata, score,
        // chunkId) directly.
        documents: candidates.map((r) => r.text),
        topN: Math.min(RERANK_TOP_N, candidates.length),
        returnDocuments: false,
      });
      const rerankMs = Date.now() - t0;

      const reordered = response.data.map((row) => candidates[row.index]);

      logMemory("rerank", {
        candidates: candidates.length,
        kept: reordered.length,
        rerankMs,
        model: RERANK_MODEL,
      });

      return { rankedRetrievals: reordered };
    } catch (err) {
      // Non-fatal: leave rankedRetrievals unset so downstream falls back to
      // the unranked candidate pool. A degraded answer beats a 5xx.
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[rerank] API call failed: ${message}`);
      logMemory("rerank", {
        candidates: candidates.length,
        kept: 0,
        error: message,
        rerankMs: Date.now() - t0,
      });
      return {};
    }
  };
}
