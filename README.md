# Compliance Copilot

An adaptive RAG compliance copilot — grounded answers, cited sources.

## Purpose

Compliance Copilot is a regulatory-RAG demo built around a fictional broker-dealer / RIA ("Kestrel Securities, LLC"). It answers natural-language compliance questions by retrieving from a curated corpus and generating an answer grounded in inline citations. The goal is a portfolio-grade demonstration of:

- **Grounded answers** — every claim is backed by a retrieved source chunk; no fabrication.
- **Auditability** — each response carries a trace (which chunks were retrieved, which were cited).
- **Evaluation discipline** — a benchmark suite measures retrieval precision and answer faithfulness, with results committed and regression-checked.
- **Adaptive routing** (planned) — query complexity will drive the retrieval strategy.

The corpus mixes **external regulation** (SEC 15c3-1/15c3-3, Reg SHO, Rule 605/606; FINRA Rules 5310/3110/3130; Advisers Act §206, Marketing Rule, Custody Rule; FinCEN BSA/AML), **internal Kestrel policies** (best-ex, code of ethics, AML, market-access controls, supervision), and **enforcement examples** (FINRA AWC). See [`project-goals.md`](./project-goals.md) for the full scope.

## Architecture

### Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **LangGraph** for the retrieve → generate pipeline
- **Pinecone** for vector search
- **OpenAI** for embeddings (`text-embedding-3-small`) and generation (`gpt-4o-mini`)
- **Tailwind**, **Vitest**, **Playwright**, **SonarQube**

### Folder layout

```
app/
├── page.tsx                 Root → DashboardPage
├── layout.tsx               Root layout
├── Pages/                   Page-level components
│   ├── DashboardPage        Query input, answer, trace, citations panel
│   ├── EvaluationsPage      Benchmark runner + saved-report viewer
│   ├── LibraryPage          Browse corpus documents
│   ├── LibraryDetailPage    Single doc + chunk inspector
│   └── HistoryPage          Past queries
├── _components/             Reusable React components (answer card, citations
│                            panel, metric card/tooltip, trace section, …)
├── _lib/corpus.ts           Corpus index + chunk fetch helpers
└── api/
    ├── query/               POST: invoke graph, return { answer, citations, retrievals }
    ├── evaluations/
    │   ├── retrieval/       POST: pinpoint-precision on a benchmark item
    │   ├── answer/          POST: LLM-as-judge faithfulness scoring
    │   └── reports/         GET list / POST save / GET [id]
    └── test-pushover/       GET: diagnostic for cap notifications

pipeline/
├── graph.ts                 StateGraph: START → retrieve → generate → END
├── state.ts                 GraphStateAnnotation (query, retrievals, answer, citations)
├── nodes/
│   ├── retrieve.ts          Pinecone searchRecords (top-5) → Retrieval[]
│   └── generate.ts          OpenAI call, inline [^N] citations, renumbered first-seen
├── instrument.ts            Memory/CPU + build/query counters
├── daily-cap.ts             500/day request cap (UTC reset)
└── notify-pushover.ts       Fire-and-forget alert when cap is hit

ingest/
├── chunk.ts                 Markdown chunker. Two modes:
│                              · Regulatory (SEC/FINRA/MSRB) — paragraph-path aware
│                                (e.g. "(a)(2)(ii)") for pinpoint citations
│                              · Fallback (Kestrel/FinCEN) — heading-slug addressing
│                            Target ~500 tokens with ~50-token overlap.
└── upsert.ts                Batch Pinecone upsert (100/req) with metadata schema

corpus/                      ~35 markdown files with YAML front-matter
                              (title, authority, citation_id, jurisdiction, doc_type,
                               effective_date, version_status, topic_tags, source_url)

eval/
├── core.ts                  Benchmark schema (Zod) + metric computation
├── runner.ts                Eval loop: invoke graph per item, stream results
├── benchmarks/pilot.yaml    10 hand-labeled items (query, expected_chunk_ids,
                              keywords, archetype)
├── results/                 Per-run reports (markdown + JSON, includes corpus SHA
                              and model IDs for reproducibility)
└── saved-reports/           Committed baselines surfaced in the UI

shared/types.ts              Single source of truth: Citation, Retrieval, Chunk,
                              ChunkMetadata, QueryResponse, GraphState

scripts/
├── ingest.ts                pnpm ingest      — corpus/*.md → chunks → Pinecone
├── reset-index.ts           pnpm reset-index — clear Pinecone index (dev)
├── verify-eval.ts           pnpm verify-eval — validate expected_chunk_ids after
                              corpus changes
└── sonar.cjs                pnpm sonar       — SonarQube scan
```

### Pipeline flow

```
   ┌──────────┐   query   ┌──────────────┐   retrievals[]   ┌──────────────┐
   │  client  │──────────▶│  retrieve    │─────────────────▶│  generate    │
   │ /api/query│          │  (Pinecone)  │                  │   (OpenAI)   │
   └──────────┘           └──────────────┘                  └──────┬───────┘
                                                                   │
                            { answer, citations, retrievals } ◀────┘
```

The graph is lazy-initialized on first query so build doesn't construct SDK clients. Citations are extracted as `[^N]` markers from the model output and renumbered by first-seen order.

### Data path

1. **Ingest** (`pnpm ingest`): each markdown doc is parsed (front-matter + body), chunked, embedded, and upserted to Pinecone with rich metadata (`authority`, `citation_id`, `paragraph_path`, `version_status`, `topic_tags`, …) so retrieval results carry pinpoint structure.
2. **Query**: the retrieve node hydrates `Retrieval[]` from Pinecone hits; the generate node formats them into a numbered context block and prompts the LLM to cite or refuse.

### Environment

Variables documented in [`.env.example`](./.env.example):

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` | Embeddings + generation |
| `PINECONE_API_KEY` | Vector search |
| `PINECONE_INDEX` | Pinecone index name |
| `PUSHOVER_USER` / `PUSHOVER_TOKEN` | Optional — cap-hit notifications |

## Roadmap

### Done

- **M1 — Ingestion.** Corpus, chunker (regulatory + fallback modes), embeddings, Pinecone upsert.
- **M2 — RAG pipeline.** Two-node LangGraph (retrieve → generate) with grounded, cited answers.
- **M3 — UI.** Dashboard, library, library-detail, history, evaluations pages; trace view; citations panel.
- **Ops.** Daily request cap with Pushover alerts, lazy graph init, design-system component library.

### In flight

- **Eval harness.** Pilot harness (10 items) shipping; UI surfaces saved reports with metric cards and tooltips.
- **UX polish.** Citations panel interactivity (click chip → open + scroll), portaled metric tooltips.

### Planned

Tracked across [`plan.md`](./plan.md), [`eval-plan.md`](./eval-plan.md), and [`corpus-improvement-plan.md`](./corpus-improvement-plan.md).

- **M4 — Full eval harness** (issues E1–E5):
  - Scale benchmark to ≥50 hand-labeled items across archetypes (exact-lookup, cross-doc, cross-authority, should-refuse, version-hygiene, enforcement-grounded, RIA-specific).
  - Pinpoint precision@5 (chunk-ID exact) + doc-level precision@5.
  - LLM-as-judge faithfulness with citation-paragraph awareness.
  - Refusal accuracy, cross-doc coverage, version-hygiene scorers.
  - GitHub Action regression gate (`pnpm eval --compare-baseline`).
- **M5 — Adaptive routing.** Query classifier node, conditional edges (single-hop vs. multi-hop vs. should-refuse), confidence scoring on answers.
- **Jobs 2–5** (post-MVP, see [`project-goals.md`](./project-goals.md)): cross-document gap analysis, examination-package assembly with HITL, web-augmented retrieval for change monitoring, multi-turn conversation.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (22 recommended)
- [pnpm](https://pnpm.io/) 10+ (`corepack enable && corepack prepare pnpm@latest --activate`)

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in credentials
```

## Development

```bash
pnpm dev           # Next.js dev server at http://localhost:3000
pnpm ingest        # Load corpus → chunks → Pinecone
pnpm eval          # Run the pilot benchmark
pnpm verify-eval   # Validate benchmark chunk IDs after corpus changes

pnpm typecheck     # tsc --noEmit (strict)
pnpm lint          # eslint .
pnpm format        # prettier --write .
pnpm build         # production build
pnpm test          # vitest
pnpm test:e2e      # playwright (builds first)
```
