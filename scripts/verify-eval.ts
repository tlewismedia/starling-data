/**
 * Verify that every `expected_chunk_id` in eval/benchmarks/pilot.yaml is
 * actually produced by the chunker when run over the corpus.
 *
 * This is a local correctness check for the benchmark file itself — it does
 * NOT call Pinecone, OpenAI, or the graph. It only runs the chunker. If a
 * chunk ID is wrong (typo, stale paragraphPath, wrong heading slug), the
 * verifier flags it and prints the closest actual chunk IDs from the same
 * citationId so the YAML can be patched without re-grepping the corpus.
 *
 * Usage:
 *   pnpm verify-eval
 *   pnpm verify-eval eval/benchmarks/pilot.yaml   # explicit path
 *
 * Exit code: 0 if every expected_chunk_id resolves, 1 otherwise.
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { chunkDocument } from "../ingest/chunk";
import type { ChunkMetadata } from "../shared/types";

interface BenchmarkItem {
  query: string;
  expected_chunk_ids: string[];
  notes?: string;
}

interface CorpusIndex {
  // chunkId → source file basename
  byChunkId: Map<string, string>;
  // citationId → list of chunkIds emitted for that doc, in chunker order
  byCitationId: Map<string, string[]>;
  // chunkId → first ~120 chars of chunk text, for previews
  textById: Map<string, string>;
}

function buildCorpusIndex(corpusDir: string): CorpusIndex {
  const byChunkId = new Map<string, string>();
  const byCitationId = new Map<string, string[]>();
  const textById = new Map<string, string>();

  const files = readdirSync(corpusDir)
    .filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "ARCHITECTURE.md")
    .map((f) => join(corpusDir, f));

  for (const filePath of files) {
    const fileName = filePath.split("/").pop() ?? filePath;
    const raw = readFileSync(filePath, "utf8");
    const { data: fm, content: body } = matter(raw);

    if (!fm["citation_id"]) continue;

    const baseMetadata: Omit<
      ChunkMetadata,
      "headingPath" | "chunkIndex" | "paragraphPath"
    > = {
      title: String(fm["title"] ?? ""),
      source: String(fm["source"] ?? ""),
      authority: String(fm["authority"] ?? "Kestrel") as ChunkMetadata["authority"],
      citationId: String(fm["citation_id"]),
      citationIdDisplay: String(fm["citation_id_display"] ?? ""),
      jurisdiction: String(fm["jurisdiction"] ?? "Internal") as ChunkMetadata["jurisdiction"],
      docType: String(fm["doc_type"] ?? "internal") as ChunkMetadata["docType"],
      effectiveDate: String(fm["effective_date"] ?? ""),
      sourceUrl: String(fm["source_url"] ?? ""),
      versionStatus: String(fm["version_status"] ?? "current") as ChunkMetadata["versionStatus"],
      topicTags: Array.isArray(fm["topic_tags"]) ? fm["topic_tags"].map(String) : [],
    };

    const chunks = chunkDocument(body, baseMetadata);
    const ids = chunks.map((c) => c.id);
    byCitationId.set(baseMetadata.citationId, ids);
    for (const c of chunks) {
      byChunkId.set(c.id, fileName);
      textById.set(c.id, c.text.replace(/\s+/g, " ").trim());
    }
  }

  return { byChunkId, byCitationId, textById };
}

function loadBenchmark(path: string): BenchmarkItem[] {
  const raw = readFileSync(path, "utf8");
  const parsed = yaml.load(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Benchmark file ${path} must be a YAML list`);
  }
  for (const [i, item] of parsed.entries()) {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Item ${i}: not an object`);
    }
    const it = item as Record<string, unknown>;
    if (typeof it["query"] !== "string") {
      throw new Error(`Item ${i}: missing string field 'query'`);
    }
    if (!Array.isArray(it["expected_chunk_ids"])) {
      throw new Error(`Item ${i}: missing array field 'expected_chunk_ids'`);
    }
  }
  return parsed as BenchmarkItem[];
}

// Extract the citationId prefix from a chunk ID (everything before the first `::`).
function citationIdOf(chunkId: string): string {
  const idx = chunkId.indexOf("::");
  return idx === -1 ? chunkId : chunkId.slice(0, idx);
}

// One-line truncated preview for display.
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function main(): void {
  const cwd = process.cwd();
  const corpusDir = resolve(cwd, "corpus");

  // --list <citationId>: print every chunk for that doc with a text preview.
  // Useful for picking the right chunk_N when paragraph-path detection didn't
  // fire (e.g. FINRA rules without .NN markers).
  const listIdx = process.argv.indexOf("--list");
  if (listIdx !== -1) {
    const target = process.argv[listIdx + 1];
    if (!target) {
      console.error("Usage: pnpm verify-eval --list <citationId>");
      process.exit(2);
    }
    const index = buildCorpusIndex(corpusDir);
    const ids = index.byCitationId.get(target);
    if (!ids) {
      console.error(`No document indexed under citationId '${target}'`);
      process.exit(2);
    }
    console.log(`${DIM}${ids.length} chunks for ${target}:${RESET}\n`);
    for (const id of ids) {
      console.log(id);
      console.log(`  ${DIM}${truncate(index.textById.get(id) ?? "", 140)}${RESET}\n`);
    }
    return;
  }

  const benchmarkPath = resolve(
    cwd,
    process.argv[2] ?? "eval/benchmarks/pilot.yaml"
  );

  console.log(`${DIM}Indexing corpus at ${corpusDir}${RESET}`);
  const index = buildCorpusIndex(corpusDir);
  console.log(
    `${DIM}Indexed ${index.byChunkId.size} chunks across ${index.byCitationId.size} documents${RESET}`
  );
  console.log(`${DIM}Loading benchmark from ${benchmarkPath}${RESET}\n`);

  const items = loadBenchmark(benchmarkPath);

  let totalExpected = 0;
  let totalHits = 0;
  const failedItems: number[] = [];

  for (const [i, item] of items.entries()) {
    const num = i + 1;
    console.log(`${num}. ${truncate(item.query, 100)}`);

    let itemHits = 0;
    let itemMisses = 0;

    for (const expected of item.expected_chunk_ids) {
      totalExpected++;
      if (index.byChunkId.has(expected)) {
        const file = index.byChunkId.get(expected);
        console.log(`   ${GREEN}✓${RESET} ${expected} ${DIM}(${file})${RESET}`);
        itemHits++;
        totalHits++;
      } else {
        console.log(`   ${RED}✗${RESET} ${expected} ${RED}NOT FOUND${RESET}`);
        itemMisses++;

        const cid = citationIdOf(expected);
        const candidates = index.byCitationId.get(cid);
        if (candidates && candidates.length > 0) {
          console.log(
            `     ${YELLOW}Did you mean one of these chunks from ${cid}?${RESET}`
          );
          for (const c of candidates.slice(0, 8)) {
            console.log(`     ${DIM}·${RESET} ${c}`);
          }
          if (candidates.length > 8) {
            console.log(`     ${DIM}… and ${candidates.length - 8} more${RESET}`);
          }
        } else {
          console.log(
            `     ${YELLOW}No chunks indexed under citationId '${cid}' — is the doc in corpus/ with matching citation_id front-matter?${RESET}`
          );
        }
      }
    }

    if (itemMisses > 0) failedItems.push(num);
    console.log();
  }

  // Summary
  const failed = failedItems.length;
  const passed = items.length - failed;
  const bar = "─".repeat(60);
  console.log(bar);
  console.log(
    `Items: ${GREEN}${passed} passed${RESET}, ${failed > 0 ? RED : DIM}${failed} failed${RESET} of ${items.length}`
  );
  console.log(
    `Chunks: ${GREEN}${totalHits} resolved${RESET}, ${totalExpected - totalHits > 0 ? RED : DIM}${totalExpected - totalHits} missing${RESET} of ${totalExpected}`
  );
  if (failed > 0) {
    console.log(`Failed items: ${failedItems.join(", ")}`);
    process.exit(1);
  }
}

main();
