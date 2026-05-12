/**
 * Tests for pipeline/nodes/citation-follow.ts — the extractor (pure) and the
 * node (Pinecone-mocked). The node only invokes `searchRecords` on the index;
 * the mock returns canned hits and records the filter argument so the suite
 * can assert citation-id resolution and follow-up search shape.
 */
import { describe, it, expect, vi } from "vitest";
import {
  createCitationFollowNode,
  extractCitationIds,
  FOLLOW_TOP_K,
} from "../../pipeline/nodes/citation-follow";
import type { GraphState } from "../../pipeline/state";
import type { ChunkMetadata, Retrieval } from "../../shared/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function meta(overrides: Partial<ChunkMetadata> = {}): ChunkMetadata {
  return {
    title: "",
    source: "",
    authority: "SEC",
    citationId: "",
    citationIdDisplay: "",
    jurisdiction: "US-Federal",
    docType: "regulation",
    effectiveDate: "",
    sourceUrl: "",
    versionStatus: "current",
    topicTags: [],
    headingPath: "",
    paragraphPath: "",
    chunkIndex: 0,
    ...overrides,
  };
}

function retrieval(
  chunkId: string,
  text: string,
  citationId: string,
): Retrieval {
  return {
    chunkId,
    text,
    score: 0.9,
    metadata: meta({ citationId }),
  };
}

function makeState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    query: "test query",
    retrievals: [],
    answer: undefined,
    citations: undefined,
    ...overrides,
  };
}

function makeVectorStoreMock(hits: object[]) {
  return {
    searchRecords: vi.fn().mockResolvedValue({
      result: { hits },
      usage: { readUnits: 1 },
    }),
  };
}

// ---------------------------------------------------------------------------
// extractCitationIds — pure regex extraction + alias resolution
// ---------------------------------------------------------------------------

describe("extractCitationIds", () => {
  it("normalises 17 CFR section citations", () => {
    const ids = extractCitationIds(
      "Under 17 CFR 240.17a-4 records must be preserved.",
    );
    expect(ids.has("17-CFR-240.17a-4")).toBe(true);
  });

  it("strips a trailing paragraph marker from 17 CFR citations", () => {
    const ids = extractCitationIds(
      "See 17 CFR 240.15c3-3(b) for possession requirements.",
    );
    expect(ids.has("17-CFR-240.15c3-3")).toBe(true);
    // Bare-rule form is NOT present — we strip the (b).
    expect(ids.has("17-CFR-240.15c3-3(b)")).toBe(false);
  });

  it("preserves the (4)-N infix used by Advisers Act rule ids", () => {
    const ids = extractCitationIds(
      "Per 17 CFR 275.206(4)-2 the surprise exam is required.",
    );
    // The (4) is part of the rule name, not a paragraph marker. The trailing
    // -2 attaches it back to the id; stripping logic only fires at end-of-token.
    expect(ids.has("17-CFR-275.206(4)-2")).toBe(true);
  });

  it("rolls up 31 CFR section citations to the part-level doc id", () => {
    const ids = extractCitationIds("FinCEN CIP at 31 CFR 1023.220 requires…");
    expect(ids.has("31-CFR-Part-1023")).toBe(true);
  });

  it("aliases Reg SHO Rule N to its 17 CFR 242 citation_id", () => {
    const ids = extractCitationIds(
      "Reg SHO Rule 203 prohibits naked short sales; Reg SHO Rule 204 sets close-out.",
    );
    expect(ids.has("17-CFR-242.203")).toBe(true);
    expect(ids.has("17-CFR-242.204")).toBe(true);
  });

  it("normalises FINRA Rule N references", () => {
    const ids = extractCitationIds(
      "FINRA Rule 5310 and FINRA Rule 3110 both apply.",
    );
    expect(ids.has("FINRA-Rule-5310")).toBe(true);
    expect(ids.has("FINRA-Rule-3110")).toBe(true);
  });

  it("normalises 15 U.S.C. citations across punctuation variants", () => {
    const ids = extractCitationIds(
      "Antifraud liability under 15 U.S.C. 80b-6 mirrors 15 USC 80b-6.",
    );
    expect(ids.has("15-USC-80b-6")).toBe(true);
  });

  it("ignores bare 'Rule N' to avoid ambiguous resolution", () => {
    // 'Rule 204' alone could be Reg SHO, FINRA, or MSRB. Only emit when a
    // regulator prefix disambiguates it.
    const ids = extractCitationIds(
      "See Rule 204 for close-out timing and Rule 5310 for best-ex.",
    );
    expect(ids.size).toBe(0);
  });

  it("returns an empty set for text with no recognised citations", () => {
    expect(extractCitationIds("This passage contains no citations.").size).toBe(
      0,
    );
  });
});

// ---------------------------------------------------------------------------
// createCitationFollowNode — graph-level integration with a mocked index
// ---------------------------------------------------------------------------

describe("citation-follow node", () => {
  it("issues no Pinecone call and returns empty retrievals when no citations are found", async () => {
    const r = retrieval(
      "Kestrel-Best-Execution-Policy::p0",
      "Kestrel weighs all relevant factors when routing.",
      "Kestrel-Best-Execution-Policy",
    );
    const vectorStore = makeVectorStoreMock([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createCitationFollowNode(vectorStore as any);
    const out = await node(makeState({ retrievals: [r] }));

    expect(out.retrievals).toEqual([]);
    expect(vectorStore.searchRecords).not.toHaveBeenCalled();
  });

  it("does not follow citationIds that already appear in state.retrievals", async () => {
    // Chunk text cites FINRA Rule 5310, but Rule 5310 is already in the set.
    const a = retrieval(
      "Kestrel-Best-Execution-Policy::p0",
      "Kestrel implements the FINRA Rule 5310 factors verbatim.",
      "Kestrel-Best-Execution-Policy",
    );
    const b = retrieval(
      "FINRA-Rule-5310::.02::p0",
      "Regular and rigorous review at least quarterly.",
      "FINRA-Rule-5310",
    );
    const vectorStore = makeVectorStoreMock([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createCitationFollowNode(vectorStore as any);
    const out = await node(makeState({ retrievals: [a, b] }));

    expect(out.retrievals).toEqual([]);
    expect(vectorStore.searchRecords).not.toHaveBeenCalled();
  });

  it("queries Pinecone with citation_id $in filter and the original user query", async () => {
    const r = retrieval(
      "Kestrel-Best-Execution-Policy::p0",
      "Kestrel implements FINRA Rule 5310 and references 17 CFR 242.605.",
      "Kestrel-Best-Execution-Policy",
    );
    const vectorStore = makeVectorStoreMock([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createCitationFollowNode(vectorStore as any);

    await node(
      makeState({
        query: "regular and rigorous review obligations",
        retrievals: [r],
      }),
    );

    expect(vectorStore.searchRecords).toHaveBeenCalledTimes(1);
    const arg = vectorStore.searchRecords.mock.calls[0][0];
    expect(arg.query.topK).toBe(FOLLOW_TOP_K);
    expect(arg.query.inputs.text).toBe("regular and rigorous review obligations");
    // $in array should hold exactly the two cited docs, in any order.
    expect(arg.query.filter.citation_id.$in).toEqual(
      expect.arrayContaining(["FINRA-Rule-5310", "17-CFR-242.605"]),
    );
    expect(arg.query.filter.citation_id.$in).toHaveLength(2);
  });

  it("hydrates ChunkMetadata on the returned chunks", async () => {
    const r = retrieval(
      "Kestrel-Best-Execution-Policy::p0",
      "References FINRA Rule 5310 throughout.",
      "Kestrel-Best-Execution-Policy",
    );
    const vectorStore = makeVectorStoreMock([
      {
        _id: "FINRA-Rule-5310::.02::p0",
        _score: 0.81,
        fields: {
          title: "FINRA Rule 5310 — Best Execution",
          source: "FINRA",
          authority: "FINRA",
          citation_id: "FINRA-Rule-5310",
          citation_id_display: "FINRA Rule 5310",
          jurisdiction: "SRO",
          doc_type: "rule",
          effective_date: "2014-05-31",
          source_url: "https://finra.org/rules/5310",
          version_status: "current",
          topic_tags: ["best-execution", "routing"],
          heading_path: "Rule 5310 > Supplementary Material > .02",
          paragraph_path: ".02",
          chunk_index: 3,
          chunk_text: "Members must conduct a regular and rigorous review…",
        },
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createCitationFollowNode(vectorStore as any);
    const out = await node(makeState({ retrievals: [r] }));

    expect(out.retrievals).toHaveLength(1);
    const got = out.retrievals![0];
    expect(got.chunkId).toBe("FINRA-Rule-5310::.02::p0");
    expect(got.score).toBe(0.81);
    expect(got.metadata?.citationId).toBe("FINRA-Rule-5310");
    expect(got.metadata?.authority).toBe("FINRA");
    expect(got.metadata?.paragraphPath).toBe(".02");
    expect(got.metadata?.topicTags).toEqual(["best-execution", "routing"]);
  });

  it("dedupes hits that match an existing retrieval by chunkId", async () => {
    // The original retrieval IS a Rule 5310 chunk; the chunk text mentions
    // 17 CFR 242.605, so the node will follow that. The mock returns one new
    // 17 CFR 242.605 chunk and (perversely) the same Rule 5310 chunk we
    // already have — the latter must be dropped.
    const existing = retrieval(
      "FINRA-Rule-5310::.02::p0",
      "Compare with 17 CFR 242.605 data and AWC findings.",
      "FINRA-Rule-5310",
    );
    const vectorStore = makeVectorStoreMock([
      {
        _id: "17-CFR-242.605::interpretive-notes-rule-605-interaction-with-rule-5310",
        _score: 0.7,
        fields: {
          chunk_text: "Rule 605 is the principal public data source…",
          citation_id: "17-CFR-242.605",
        },
      },
      // Duplicate of an existing retrieval — must be filtered out.
      {
        _id: "FINRA-Rule-5310::.02::p0",
        _score: 0.6,
        fields: { chunk_text: "duplicate", citation_id: "FINRA-Rule-5310" },
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createCitationFollowNode(vectorStore as any);
    const out = await node(makeState({ retrievals: [existing] }));

    expect(out.retrievals).toHaveLength(1);
    expect(out.retrievals![0].chunkId).toBe(
      "17-CFR-242.605::interpretive-notes-rule-605-interaction-with-rule-5310",
    );
  });
});
