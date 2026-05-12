import { Pinecone } from "@pinecone-database/pinecone";
import type { GraphState } from "../state";
import type { ChunkMetadata, Retrieval } from "../../shared/types";
import { logMemory } from "../instrument";

// Oversample so the downstream rerank node has a real candidate pool to
// promote from. The reranker can only reorder chunks that are present —
// passing it 5 caps its impact at "best of 5." 20 strikes a balance
// between recall headroom and rerank latency / context-window pressure.
export const RETRIEVE_TOP_K = 20;

const str = (f: Record<string, unknown>, key: string): string =>
  String(f[key] ?? "");

export function createRetrieveNode(
  vectorStore: ReturnType<Pinecone["index"]>
) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const t0 = Date.now();
    const response = await vectorStore.searchRecords({
      query: { topK: RETRIEVE_TOP_K, inputs: { text: state.query } },
    });
    const pineconeMs = Date.now() - t0;

    const retrievals: Retrieval[] = response.result.hits.map((hit) => {
      const f = hit.fields as Record<string, unknown>;
      const rawTags = f["topic_tags"];
      const topicTags: readonly string[] = Array.isArray(rawTags)
        ? rawTags.map((t) => String(t))
        : [];
      const metadata: ChunkMetadata = {
        title: str(f, "title"),
        source: str(f, "source"),
        authority: (str(f, "authority") ||
          "Kestrel") as ChunkMetadata["authority"],
        citationId: str(f, "citation_id"),
        citationIdDisplay: str(f, "citation_id_display"),
        jurisdiction: str(f, "jurisdiction") as ChunkMetadata["jurisdiction"],
        docType: str(f, "doc_type") as ChunkMetadata["docType"],
        effectiveDate: str(f, "effective_date"),
        sourceUrl: str(f, "source_url"),
        versionStatus: (str(f, "version_status") ||
          "current") as ChunkMetadata["versionStatus"],
        topicTags,
        headingPath: str(f, "heading_path"),
        paragraphPath: str(f, "paragraph_path"),
        chunkIndex: Number(f["chunk_index"] ?? 0),
      };
      
      return {
        chunkId: hit._id,
        text: str(f, "chunk_text"),
        score: hit._score,
        metadata,
      };
    });

    const totalChars = retrievals.reduce((n, r) => n + r.text.length, 0);
    logMemory("retrieve", {
      hits: retrievals.length,
      chars: totalChars,
      pineconeMs,
    });

    return { retrievals };
  };
}
