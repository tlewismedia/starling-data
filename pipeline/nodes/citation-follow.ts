/**
 * Citation-following retrieval node.
 *
 * Reads the chunks produced by the prior `retrieve` node, extracts the rule
 * citations that appear in their text (e.g. "17 CFR 240.17a-4",
 * "FINRA Rule 5310", "Reg SHO Rule 203"), normalises each to a canonical
 * `citation_id`, and fetches additional chunks from those documents via
 * Pinecone with a metadata filter. The append reducer on `state.retrievals`
 * (pipeline/state.ts) merges the new hits with the originals.
 *
 * Why: regulatory and policy text constantly cites adjacent rules. Pure
 * dense similarity often surfaces only one side of a cross-reference;
 * following the citation deterministically pulls the companion chunk(s)
 * a compliance reader would consult next.
 *
 * Scope: this node only follows citations *from* retrieved chunks. It does
 * not extract citations from the user query — that is a separate filter
 * pattern handled (or not) upstream.
 */
import { Pinecone } from "@pinecone-database/pinecone";
import type { GraphState } from "../state";
import type { ChunkMetadata, Retrieval } from "../../shared/types";
import { logMemory } from "../instrument";

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

// Cap on total followed-citation chunks added per query. Pinecone returns a
// flat top-K across the filtered docs; we trust similarity-to-original-query
// for ordering. Increase cautiously — generate.ts feeds every retrieval into
// the prompt.
export const FOLLOW_TOP_K = 5;

// ---------------------------------------------------------------------------
// Citation extractor
// ---------------------------------------------------------------------------

// FinCEN BSA regulations in this corpus are indexed at the part level
// (e.g. "31-CFR-Part-1023"), not the section level. Section citations like
// "31 CFR 1023.220" must be rolled up to the part doc.
const FINCEN_PART_CITATION_IDS: ReadonlyMap<string, string> = new Map([
  ["1023", "31-CFR-Part-1023"],
  ["1010", "31-CFR-Part-1010"],
]);

// Citation patterns. Each match is normalised to a corpus `citation_id`.
// `bare Rule N` (without a regulator prefix) is intentionally excluded —
// too ambiguous between FINRA, Reg SHO, MSRB, and the Advisers Act.
const PATTERNS: ReadonlyArray<{
  readonly regex: RegExp;
  readonly toCitationId: (match: RegExpMatchArray) => string | null;
}> = [
  // 17 CFR section citations, normalised to the corpus citation_id form:
  //   "17 CFR 240.17a-4"        → "17-CFR-240.17a-4"
  //   "17 CFR 240.15c3-3(b)"    → "17-CFR-240.15c3-3"   (paragraph stripped)
  //   "17 CFR 275.206(4)-2"     → "17-CFR-275.206(4)-2" (rule-name infix kept)
  //   "17 CFR 275.206(4)-2(d)"  → "17-CFR-275.206(4)-2" (paragraph stripped)
  // Group 1 captures the rule id, including any `(N)-N` rule-name infix.
  // The trailing bare `(N)` paragraph marker is consumed but not captured.
  {
    regex: /\b17\s+CFR\s+(\d{3}\.[0-9A-Za-z-]+(?:\(\d+\)-[0-9A-Za-z-]+)?)(?:\([0-9A-Za-z]+\))?/g,
    toCitationId: (m) => `17-CFR-${m[1]}`,
  },
  // "31 CFR 1023.220" → roll up to part-level citation_id.
  {
    regex: /\b31\s+CFR\s+(\d+)\.\d+/g,
    toCitationId: (m) => FINCEN_PART_CITATION_IDS.get(m[1]) ?? null,
  },
  // "15 U.S.C. 80b-6", "15 USC 80b-6"
  {
    regex: /\b15\s+U\.?\s*S\.?\s*C\.?\s+([0-9a-zA-Z-]+)/g,
    toCitationId: (m) => `15-USC-${m[1]}`,
  },
  // "Reg SHO Rule 203" → "17-CFR-242.203" (Reg SHO sits in 17 CFR 242.xxx).
  {
    regex: /\bReg\s+SHO\s+Rule\s+(20[0-9])\b/gi,
    toCitationId: (m) => `17-CFR-242.${m[1]}`,
  },
  // "FINRA Rule 5310", "FINRA Rule 3110.15" — keep only the base rule number.
  {
    regex: /\bFINRA\s+Rule\s+(\d{3,5})\b/gi,
    toCitationId: (m) => `FINRA-Rule-${m[1]}`,
  },
  // "MSRB Rule G-18". May or may not be in the corpus; harmless if absent.
  {
    regex: /\bMSRB\s+Rule\s+([A-Z]-\d+)\b/g,
    toCitationId: (m) => `MSRB-Rule-${m[1]}`,
  },
];

/**
 * Extract canonical `citation_id` candidates from a chunk's body text.
 * Returns a Set so callers can union across many chunks cheaply. Unknown
 * regulators (e.g. an MSRB rule whose doc isn't in the corpus) are still
 * emitted — the Pinecone filter will simply return zero hits for them.
 */
export function extractCitationIds(text: string): Set<string> {
  const out = new Set<string>();
  for (const { regex, toCitationId } of PATTERNS) {
    // Reset state because regexes are declared once at module scope.
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const id = toCitationId(m);
      if (id) out.add(id);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

const str = (f: Record<string, unknown>, key: string): string =>
  String(f[key] ?? "");

export function createCitationFollowNode(
  vectorStore: ReturnType<Pinecone["index"]>,
) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const t0 = Date.now();

    // 1. Citation IDs already in the retrieval set — don't re-fetch their docs.
    const seen = new Set<string>();
    for (const r of state.retrievals) {
      if (r.metadata?.citationId) seen.add(r.metadata.citationId);
    }

    // 2. Union of citations referenced *inside* the retrieved chunks.
    const cited = new Set<string>();
    for (const r of state.retrievals) {
      for (const id of extractCitationIds(r.text)) cited.add(id);
    }

    // 3. Candidates: cited but not yet retrieved.
    const toFollow = [...cited].filter((id) => !seen.has(id));

    if (toFollow.length === 0) {
      logMemory("citation-follow", {
        followedDocs: 0,
        newChunks: 0,
        elapsedMs: Date.now() - t0,
      });
      return { retrievals: [] };
    }

    // 4. One filtered search, ranked by similarity to the original query.
    const response = await vectorStore.searchRecords({
      query: {
        topK: FOLLOW_TOP_K,
        inputs: { text: state.query },
        filter: { citation_id: { $in: toFollow } },
      },
    });

    // 5. Dedupe against chunks we already have.
    const existingIds = new Set(state.retrievals.map((r) => r.chunkId));
    const newOnes: Retrieval[] = [];
    for (const hit of response.result.hits) {
      if (existingIds.has(hit._id)) continue;
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
      newOnes.push({
        chunkId: hit._id,
        text: str(f, "chunk_text"),
        score: hit._score,
        metadata,
      });
    }

    logMemory("citation-follow", {
      followedDocs: toFollow.length,
      newChunks: newOnes.length,
      elapsedMs: Date.now() - t0,
    });

    return { retrievals: newOnes };
  };
}
