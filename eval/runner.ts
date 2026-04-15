/**
 * Pilot eval runner.
 *
 * Loads `eval/benchmarks/pilot.yaml`, runs each query through the compiled
 * graph, scores `pinpoint_precision@5` per item (fraction of expected chunk
 * IDs present in the top-5 retrieved IDs), and writes a markdown table to
 * stdout and to `eval/results/<date>-<sha>.md`.
 *
 * Always exits 0 — no regression gating in the pilot.
 *
 * Usage:
 *   pnpm eval
 *   pnpm eval eval/benchmarks/pilot.yaml   # explicit path
 */

import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { execSync } from "child_process";
import yaml from "js-yaml";
import { graph } from "../pipeline/graph";

interface BenchmarkItem {
  query: string;
  expected_chunk_ids: string[];
  notes?: string;
}

interface ItemResult {
  query: string;
  expected: string[];
  retrieved: string[];
  hits: number;
  precision: number;
}

function loadBenchmark(path: string): BenchmarkItem[] {
  const parsed = yaml.load(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must be a YAML list`);
  }
  return parsed as BenchmarkItem[];
}

function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "nogit";
  }
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Render a chunk-id list compactly for the table cell.
function fmtIds(ids: string[]): string {
  if (ids.length === 0) return "—";
  return ids.map((id) => `\`${id}\``).join("<br>");
}

function buildReport(results: ItemResult[]): string {
  const overall =
    results.reduce((sum, r) => sum + r.precision, 0) / results.length;

  const lines: string[] = [];
  lines.push(`# Eval pilot — ${isoDate()} (${gitShortSha()})`);
  lines.push("");
  lines.push(
    `**Overall pinpoint_precision@5: ${overall.toFixed(3)}** ` +
      `(${results.filter((r) => r.precision === 1).length}/${results.length} fully resolved)`
  );
  lines.push("");
  lines.push("| # | Query | Expected | Top-5 retrieved | Hit |");
  lines.push("|---|---|---|---|---|");
  for (const [i, r] of results.entries()) {
    const hit =
      r.precision === 1
        ? "✅"
        : r.precision === 0
          ? "❌"
          : `⚠️ ${r.hits}/${r.expected.length}`;
    lines.push(
      `| ${i + 1} | ${r.query} | ${fmtIds(r.expected)} | ${fmtIds(r.retrieved)} | ${hit} |`
    );
  }
  return lines.join("\n") + "\n";
}

async function main(): Promise<void> {
  const benchmarkPath = resolve(
    process.cwd(),
    process.argv[2] ?? "eval/benchmarks/pilot.yaml"
  );

  const items = loadBenchmark(benchmarkPath);
  console.log(`Running ${items.length} items from ${benchmarkPath}\n`);

  const results: ItemResult[] = [];
  for (const [i, item] of items.entries()) {
    process.stdout.write(`[${i + 1}/${items.length}] ${item.query.slice(0, 70)}… `);
    const state = await graph.invoke({ query: item.query });
    const retrieved = (state.retrievals ?? []).map((r) => r.chunkId);
    const expectedSet = new Set(item.expected_chunk_ids);
    const hits = retrieved.filter((id) => expectedSet.has(id)).length;
    const precision = hits / item.expected_chunk_ids.length;
    results.push({
      query: item.query,
      expected: item.expected_chunk_ids,
      retrieved,
      hits,
      precision,
    });
    console.log(precision === 1 ? "✓" : `${hits}/${item.expected_chunk_ids.length}`);
  }

  const report = buildReport(results);
  console.log("\n" + report);

  const outPath = resolve(
    process.cwd(),
    `eval/results/${isoDate()}-${gitShortSha()}.md`
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, report);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
