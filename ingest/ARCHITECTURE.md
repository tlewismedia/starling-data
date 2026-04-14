# Ingestion Pipeline — Architecture

Turns `corpus/*.md` into searchable vector records in Pinecone. Run with `pnpm ingest`.

---

## Overview

```mermaid
flowchart TD
    A[corpus/*.md] --> B[scripts/ingest.ts]

    subgraph B[scripts/ingest.ts]
        direction TB
        B1[Env validation\nPINECONE_API_KEY\nPINECONE_INDEX] --> B2[describeIndex\nstartup check]
        B2 --> B3[Read + parse\ngray-matter]
        B3 --> B4[Extract front-matter\n+ markdown body]
    end

    B4 --> C[ingest/chunk.ts\nchunkDocument]

    subgraph C[ingest/chunk.ts — chunkDocument]
        direction TB
        C1[Split on H1/H2/H3\nheaders] --> C2[Track heading path\nper section]
        C2 --> C3[Pack sentences into\n~500-token chunks]
        C3 --> C4[Add ~50-token\noverlap between chunks]
        C4 --> C5[Guard: never split\nmid-citation or mid-sentence]
    end

    C5 --> D[Chunk[]\nid · text · metadata]

    D --> E[ingest/upsert.ts\nupsertChunks]

    subgraph E[ingest/upsert.ts — upsertChunks]
        direction TB
        E1[Map Chunk → flat\nPinecone record] --> E2[Batch into\n≤100 records]
        E2 --> E3[index.upsertRecords\nintegrated-embedding API]
    end

    E3 --> F[(Pinecone\ncompliance-copilot)]

    F -.->|searchRecords at query time| G[pipeline/nodes/retrieve.ts]
```

---

## Record schema

Every record in Pinecone is **flat** — no nested `metadata` object, no object values. The text field is declared by the index's `fieldMap` and is what Pinecone embeds automatically.

| Field | Type | Example |
|---|---|---|
| `id` | string | `12 CFR 1026.18::chunk_0` |
| `text` | string | chunk body (embedded by Pinecone) |
| `title` | string | `"CFPB Regulation Z — §1026.18"` |
| `source` | string | `"CFPB"` |
| `citation_id` | string | `"12 CFR 1026.18"` |
| `jurisdiction` | string | `"US-Federal"` |
| `doc_type` | string | `"regulation"` |
| `effective_date` | string | `"2011-12-30"` |
| `source_url` | string | canonical `.gov` URL |
| `chunk_index` | number | `0` |
| `heading_path` | string | `"Truth in Lending > Required disclosures"` |

---

## Chunking strategy

```mermaid
flowchart LR
    A[Raw markdown] --> B{Has headers?}
    B -->|Yes| C[Split at H1/H2/H3\nboundaries]
    B -->|No| D[Treat whole body\nas one section]
    C --> E[Pack sentences\n~500 tokens each]
    D --> E
    E --> F[Slide 50-token\noverlap window]
    F --> G[Chunk[]]
```

**Token heuristic:** `1 token ≈ 0.75 words` → target word budget = 375 words, overlap = 38 words.

**Citation protection:** sentence splitter guards against splitting on `.` preceded by a digit or uppercase letter, preserving strings like `12 CFR 1026.18` and `U.S.C.` within a single chunk.

**ID format:** `${citationId}::chunk_${globalIndex}` — stable across re-runs, enabling idempotent upserts.

---

## Module responsibilities

| Module | Responsibility |
|---|---|
| `scripts/ingest.ts` | CLI entry point. Env validation, startup index check, file loading, orchestration, JSON-line logging. |
| `ingest/chunk.ts` | Pure function: `chunkDocument(body, metadata) → Chunk[]`. No I/O. |
| `ingest/upsert.ts` | Pinecone I/O only: maps `Chunk[]` to flat records, batches, calls `upsertRecords`. No business logic. |

---

## Re-ingestion

`pnpm ingest` is idempotent. Re-running with the same corpus overwrites existing records (same IDs, same content) — no duplicates, no errors.

To re-ingest after editing a corpus file: just run `pnpm ingest` again.
