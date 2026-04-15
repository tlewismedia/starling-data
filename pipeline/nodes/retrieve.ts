import { Pinecone } from "@pinecone-database/pinecone";
import type { GraphState } from "../state";
import type { ChunkMetadata, Retrieval } from "../../shared/types";

const str = (f: Record<string, unknown>, key: string): string =>
  String(f[key] ?? "");

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
        title: str(f, "title"),
        source: str(f, "source"),
        citationId: str(f, "citation_id"),
        jurisdiction: str(f, "jurisdiction"),
        docType: str(f, "doc_type"),
        effectiveDate: str(f, "effective_date"),
        sourceUrl: str(f, "source_url"),
        headingPath: str(f, "heading_path"),
        chunkIndex: Number(f["chunk_index"] ?? 0),
      };
      return {
        chunkId: hit._id,
        text: str(f, "chunk_text"),
        score: hit._score,
        metadata,
      };
    });

    return { retrievals };
  };
}
