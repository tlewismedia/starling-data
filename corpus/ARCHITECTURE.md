# Corpus — Architecture

Pure-content directory: short markdown excerpts (2–10 KB each) that the ingester reads from disk and turns into Pinecone records. No code lives here.

> See `corpus/README.md` for the full front-matter schema, document inventory, source URLs, and "how to add a document" workflow. This file documents only the architectural contract between corpus content and the rest of the system.

---

## Overview

```mermaid
flowchart LR
    A[corpus/*.md<br/>front-matter + body] --> B[scripts/ingest.ts<br/>readdirSync · gray-matter]
    B --> C[ingest/chunk.ts<br/>chunkDocument]
    C --> D[ingest/upsert.ts]
    D --> E[(Pinecone<br/>compliance-copilot)]

    R[corpus/README.md] -.->|excluded by name| B
```

---

## The contract

The directory is a flat folder of `.md` files. The ingester treats every file as a document **except** `README.md` (and now `ARCHITECTURE.md`), which are filtered by name in `scripts/ingest.ts`.

Each document is a YAML front-matter block followed by a markdown body. The fields are not arbitrary metadata — they map 1:1 to flat Pinecone record fields produced by `ingest/upsert.ts`, and a citation flowing back from the LLM in `pipeline/nodes/generate.ts` is identified by the `citation_id` field set here.

| Front-matter field | Flows to | Used at query time for |
|---|---|---|
| `title` | record `title` | sources panel header |
| `source` | record `source` | publisher bucket |
| `citation_id` | record `citation_id`, **chunk ID prefix** | `[^N]` marker in answer |
| `jurisdiction` | record `jurisdiction` | (future) filter |
| `doc_type` | record `doc_type` | (future) filter |
| `effective_date` | record `effective_date` | (future) recency ranking |
| `source_url` | record `source_url` | future deep-link in citation |
| `retrieved_at` | not stored | provenance only |

---

## Invariants

- **Filename ≠ identity.** The stable identifier is `citation_id` from front-matter — chunk IDs are `${citation_id}::chunk_${N}`. Renaming a `.md` file does **not** orphan its records; changing `citation_id` does.
- **Body must contain H1/H2/H3 headers** for the chunker to produce meaningful `heading_path` values. A flat document still ingests, but every chunk gets `heading_path: ""`.
- **Excerpts must stay ≤ 10 KB** (per the README). The chunker has no upper bound, but staying small keeps re-ingest fast and chunk counts predictable.
- **No images, no inline HTML, no code fences with non-prose content** — the chunker is sentence-oriented and treats everything as text to embed.

---

## Failure modes

| Failure | Surfaces as |
|---|---|
| Missing required front-matter field | `scripts/ingest.ts` logs `status: "skipped"` with the missing field names; document is not ingested. |
| Duplicate `citation_id` across two files | Second file's chunks **overwrite** the first's (same ID prefix). Silent — no error. |
| Front-matter YAML syntax error | `gray-matter` throws → ingest exits with code 1. |
| Empty body after front-matter strip | Chunker produces zero chunks; document silently absent from index. |
