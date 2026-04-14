# Project Goals

A concise, ranked list. Everything else follows from these.

## Primary goal

Build an adaptive RAG system that acts as a regulatory compliance copilot for financial institutions — natural-language queries return grounded, source-cited answers with an auditable decision trail.

## What "done" looks like (portfolio bar)

1. **Grounded answers.** Every response cites retrieved chunks inline. The system never fabricates — if retrieval is insufficient, it says so.
2. **Adaptive routing.** Query complexity drives the retrieval strategy. A simple lookup and a multi-document gap analysis do not take the same path.
3. **Confidence is surfaced, not hidden.** Low-confidence answers are flagged explicitly. Uncertainty is a feature, not a bug.
4. **Auditability.** Every answer carries a trace: which path was chosen, which documents were consulted, which confidence tier was assigned.
5. **Evaluation discipline.** A curated benchmark set measures retrieval precision, answer faithfulness, and flag accuracy. Changes are regressions-checked.

## Five jobs the system must eventually do

1. **Rapid regulatory lookup** — single-hop retrieval, fast path.
2. **Cross-reference analysis** — multi-hop gap analysis across regulatory + internal docs.
3. **Examination preparation** — agentic document assembly with human-in-the-loop review.
4. **Plain-language interpretation** — accessible explanations with confidence scoring.
5. **Regulatory change monitoring** — recency-sensitive queries with web-augmented retrieval.

## MVP scope (what we build first)

Only Job 1 — rapid regulatory lookup — end-to-end:

- **Data ingestion:** sample internal + regulatory corpus → chunks → embeddings → vector store.
- **RAG pipeline:** query → retrieval → grounded generation with inline citations.
- **UI:** single-page dashboard with a query input, answer panel, and sources panel.

Everything else (multi-hop, CRAG, agentic exam prep, HITL, change feed, eval dashboard) is deferred. The MVP architecture is designed to make those additions incremental, not rewrites.

## Non-goals for the MVP

- No multi-agent orchestration.
- No web search / CRAG path.
- No human-in-the-loop interrupts.
- No examination package builder, change feed, document library UI.
- No mock data fixtures in the UI layer — the dashboard talks to the real pipeline or it doesn't render.
- No feature flags, no backwards-compat shims.

## What this project is demonstrating

1. Domain understanding — a real industry problem, not a toy demo.
2. Production thinking — citations, confidence, traces, graceful degradation.
3. Graph-routing mastery — conditional paths that earn their complexity.
4. Evaluation discipline — benchmarked, not vibes-checked.
5. Regulatory awareness — auditability and explainability as first-class concerns.
