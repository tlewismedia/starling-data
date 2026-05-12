/**
 * Tests for pipeline/nodes/rerank.ts.
 *
 * The node calls `pinecone.inference.rerank(...)`. The fake Pinecone here
 * stubs only that one method — the surface the rerank node touches — and
 * records its arguments so the suite can assert request shape.
 */
import { describe, it, expect, vi } from "vitest";
import {
  createRerankNode,
  RERANK_MODEL,
  RERANK_TOP_N,
} from "../../pipeline/nodes/rerank";
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

function retrieval(chunkId: string, text: string): Retrieval {
  return {
    chunkId,
    text,
    score: 0.5,
    metadata: meta({ citationId: chunkId.split("::")[0] }),
  };
}

function makeState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    query: "test query",
    retrievals: [],
    rankedRetrievals: undefined,
    answer: undefined,
    citations: undefined,
    ...overrides,
  };
}

// Build a Pinecone-shaped object exposing only `inference.rerank`. The rerank
// node never touches any other surface, so the cast is safe.
function makePineconeMock(
  rerankImpl: (args: unknown) => Promise<unknown>,
): {
  inference: { rerank: ReturnType<typeof vi.fn> };
} {
  return {
    inference: {
      rerank: vi.fn().mockImplementation(rerankImpl),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("rerank node", () => {
  it("passes through unchanged when there is nothing to rerank (0 chunks)", async () => {
    const pinecone = makePineconeMock(async () => ({ data: [] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createRerankNode(pinecone as any);

    const out = await node(makeState({ retrievals: [] }));

    expect(out.rankedRetrievals).toEqual([]);
    expect(pinecone.inference.rerank).not.toHaveBeenCalled();
  });

  it("passes through unchanged when there is only one chunk", async () => {
    const r = retrieval("FINRA-Rule-5310::.02::p0", "single chunk text");
    const pinecone = makePineconeMock(async () => ({ data: [] }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createRerankNode(pinecone as any);

    const out = await node(makeState({ retrievals: [r] }));

    expect(out.rankedRetrievals).toEqual([r]);
    expect(pinecone.inference.rerank).not.toHaveBeenCalled();
  });

  it("sends model, query, and chunk text array to the rerank API", async () => {
    const r0 = retrieval("a::p0", "alpha text");
    const r1 = retrieval("b::p0", "beta text");
    const r2 = retrieval("c::p0", "gamma text");
    // Return the same order — assertions are on the request, not the response.
    const pinecone = makePineconeMock(async () => ({
      data: [
        { index: 0, score: 0.9 },
        { index: 1, score: 0.8 },
        { index: 2, score: 0.7 },
      ],
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createRerankNode(pinecone as any);

    await node(
      makeState({
        query: "best execution review obligations",
        retrievals: [r0, r1, r2],
      }),
    );

    const arg = pinecone.inference.rerank.mock.calls[0][0];
    expect(arg.model).toBe(RERANK_MODEL);
    expect(arg.query).toBe("best execution review obligations");
    expect(arg.documents).toEqual(["alpha text", "beta text", "gamma text"]);
    expect(arg.topN).toBe(3); // capped by candidate count, not RERANK_TOP_N
    expect(arg.returnDocuments).toBe(false);
  });

  it("caps topN at RERANK_TOP_N even when there are many candidates", async () => {
    const many = Array.from({ length: 18 }, (_, i) =>
      retrieval(`doc-${i}`, `text ${i}`),
    );
    const pinecone = makePineconeMock(async () => ({
      data: many.map((_, i) => ({ index: i, score: 1 - i / 100 })),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createRerankNode(pinecone as any);

    await node(makeState({ retrievals: many }));

    const arg = pinecone.inference.rerank.mock.calls[0][0];
    expect(arg.topN).toBe(RERANK_TOP_N);
  });

  it("reorders the original Retrieval objects by the response indices", async () => {
    // Three input chunks; reranker says 2 is best, then 0, then 1.
    // Output must preserve chunkId and metadata of the original objects —
    // the reranker only returns indices + scores, so the node must look up
    // each original by index.
    const r0 = retrieval("doc-A::p0", "alpha");
    const r1 = retrieval("doc-B::p0", "beta");
    const r2 = retrieval("doc-C::p0", "gamma");
    const pinecone = makePineconeMock(async () => ({
      data: [
        { index: 2, score: 0.95 },
        { index: 0, score: 0.6 },
        { index: 1, score: 0.4 },
      ],
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createRerankNode(pinecone as any);

    const out = await node(makeState({ retrievals: [r0, r1, r2] }));

    expect(out.rankedRetrievals).toHaveLength(3);
    expect(out.rankedRetrievals![0].chunkId).toBe("doc-C::p0");
    expect(out.rankedRetrievals![1].chunkId).toBe("doc-A::p0");
    expect(out.rankedRetrievals![2].chunkId).toBe("doc-B::p0");
    // Metadata + original score are preserved (rerank only reorders).
    expect(out.rankedRetrievals![0].metadata).toBe(r2.metadata);
  });

  it("returns an empty partial state when the rerank API throws (graceful fallback)", async () => {
    const r0 = retrieval("doc-A::p0", "alpha");
    const r1 = retrieval("doc-B::p0", "beta");
    const pinecone = makePineconeMock(async () => {
      throw new Error("rerank service unavailable");
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = createRerankNode(pinecone as any);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const out = await node(makeState({ retrievals: [r0, r1] }));

    // No rankedRetrievals key → downstream chunksForPrompt falls back to
    // state.retrievals (the candidate pool) in its existing order.
    expect(out.rankedRetrievals).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(out, "rankedRetrievals")).toBe(
      false,
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
