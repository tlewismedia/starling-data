import { Pinecone } from "@pinecone-database/pinecone";
import type { GraphState } from "../state";
import type { ChunkMetadata, Retrieval } from "../../shared/types";

export function createRetrieveNode(
  vectorStore: ReturnType<Pinecone["index"]>
) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const response = await vectorStore.searchRecords({
      query: { topK: 5, inputs: { text: state.query } },
    });

    const retrievals: Retrieval[] = response.result.hits.map((hit) => {
      const f = hit.fields as Record<string, unknown>;
      const metadata: ChunkMetadata = {
        title: String(f["title"] ?? ""),
        source: String(f["source"] ?? ""),
        citationId: String(f["citation_id"] ?? ""),
        jurisdiction: String(f["jurisdiction"] ?? ""),
        docType: String(f["doc_type"] ?? ""),
        effectiveDate: String(f["effective_date"] ?? ""),
        sourceUrl: String(f["source_url"] ?? ""),
        headingPath: String(f["heading_path"] ?? ""),
        chunkIndex: Number(f["chunk_index"] ?? 0),
      };
      return {
        chunkId: hit._id,
        text: String(f["chunk_text"] ?? ""),
        score: hit._score,
        metadata,
      };
    });

    return { retrievals };
  };
}
