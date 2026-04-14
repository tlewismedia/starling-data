---
description: Run the corpus ingestion pipeline and sanity-check chunks + upserts
---

Run the ingestion pipeline (`pnpm ingest`) and verify the round-trip from corpus to Pinecone.

Steps:

1. Confirm env vars are set: `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`. Stop and tell the human if any are missing.
2. Run `pnpm ingest`. Capture stdout — the pipeline should log chunk count and upsert count.
3. Sanity checks:
   - Chunk count is non-zero and roughly matches `corpus/` size.
   - Upsert count equals chunk count (no silent failures).
   - No "fabricated chunk" warnings from the chunker.
4. If the Pinecone MCP is connected, list the index and confirm vector count increased.
5. Run the ingest round-trip test if it exists: `pnpm test tests/integration/ingest.test.ts`.

Report back:

- Chunk count, upsert count, elapsed time.
- Any warnings or errors.
- Whether the round-trip test passed.

Do not modify the corpus, the ingest code, or index configuration as part of this command. If something is wrong, surface it — fixing is a separate task.
