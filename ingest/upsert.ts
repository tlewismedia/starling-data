/**
 * Thin Pinecone upsert wrapper using integrated-embedding index API.
 *
 * Receives ready-made `Chunk[]` and maps them to flat Pinecone records.
 * Batches at most 100 records per request (Pinecone limit).
 * Knows nothing about front-matter — that responsibility lives in the caller.
 */

import { Pinecone } from "@pinecone-database/pinecone";
import type { Chunk } from "../shared/types";

const BATCH_SIZE = 100;

/**
 * Flat record shape sent to Pinecone.
 * No nesting, no `metadata` field, no object values — all fields are primitives.
 *
 * We use `Record<string, string | number | boolean | string[]>` as the base type
 * to satisfy `IntegratedRecord<RecordMetadata>` required by the Pinecone SDK.
 */
type PineconeIngestRecord = {
  id: string;
  chunk_text: string;
  title: string;
  source: string;
  citation_id: string;
  jurisdiction: string;
  doc_type: string;
  effective_date: string;
  source_url: string;
  chunk_index: number;
  heading_path: string;
  [key: string]: string | number | boolean | string[];
};

function chunkToRecord(chunk: Chunk): PineconeIngestRecord {
  const m = chunk.metadata;
  return {
    id: chunk.id,
    chunk_text: chunk.text,
    title: m.title,
    source: m.source,
    citation_id: m.citationId,
    jurisdiction: m.jurisdiction,
    doc_type: m.docType,
    effective_date: m.effectiveDate,
    source_url: m.sourceUrl,
    chunk_index: m.chunkIndex,
    heading_path: m.headingPath,
  };
}

/**
 * Upsert `chunks` into the Pinecone integrated-embedding index.
 *
 * @param pc        - Authenticated Pinecone client.
 * @param indexName - Name of the target Pinecone index.
 * @param chunks    - Chunks to upsert.
 */
export async function upsertChunks(
  pc: Pinecone,
  indexName: string,
  chunks: Chunk[]
): Promise<void> {
  if (chunks.length === 0) return;

  const index = pc.index(indexName);
  const records = chunks.map(chunkToRecord);

  // Batch into groups of at most BATCH_SIZE.
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await index.upsertRecords({ records: batch });
  }
}
