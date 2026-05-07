# Eval Pilot Plan

## Goal

A `pnpm eval` command that runs the 10 benchmark questions through the
compiled graph, scores retrieval, and prints a markdown table. Tight loop:
change a prompt or retrieval setting, rerun, see the score move.

## What's already in place

- `eval/benchmarks/pilot.yaml` — 10 hand-labelled items, each with a query and
  one or more `expected_chunk_ids`.
- `scripts/verify-eval.ts` (`pnpm verify-eval`) — runs the chunker locally and
  confirms every `expected_chunk_id` resolves. Run this whenever the chunker
  changes; patch the YAML against its near-miss suggestions.
- `scripts/reset-index.ts` (`pnpm reset-index`) — wipe Pinecone when chunk IDs
  change. Canonical re-ingest sequence is `pnpm reset-index && pnpm ingest`.

## What's left

1. `eval/runner.ts` (`pnpm eval`):
   - Load `eval/benchmarks/pilot.yaml`.
   - For each item, invoke the compiled graph and read retrieved chunk IDs
     from `GraphState`.
   - Compute `pinpoint_precision@5` per item — fraction of `expected_chunk_ids`
     present in the top-5 retrieved IDs — and the overall mean.
   - Print one markdown table to stdout (`query | expected | top-5 | hit?`)
     and write the same to `eval/results/<date>-<sha>.md`.

That's it. Exits 0 regardless of score.

## Out of scope for the pilot

LLM-as-judge faithfulness, refusal accuracy, baselines, regression gating,
CI wiring, archetype slicing, scaling past 10 items. All deferred to
`eval-plan.md`.

## Done

- `pnpm eval` runs locally against `PINECONE_INDEX` and prints a table with
  10 rows + a summary score.
- Changing one retrieval knob (e.g. `topK`) visibly moves the score on rerun.
