/**
 * Dump the full text of one or more chunks by ID.
 *
 * Runs the chunker over the corpus locally — no Pinecone, no embeddings.
 * Useful for verifying that benchmark keywords actually appear in the
 * chunks they're labelled against.
 *
 * Usage:
 *   pnpm tsx scripts/dump-chunk.ts <chunkId> [chunkId ...]
 */
import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import matter from "gray-matter";
import { chunkDocument } from "../ingest/chunk";
import type { ChunkMetadata } from "../shared/types";

function indexCorpus(corpusDir: string): Map<string, string> {
  const out = new Map<string, string>();
  const files = readdirSync(corpusDir)
    .filter(
      (f) => f.endsWith(".md") && f !== "README.md" && f !== "ARCHITECTURE.md",
    )
    .map((f) => join(corpusDir, f));

  for (const filePath of files) {
    const raw = readFileSync(filePath, "utf8");
    const { data: fm, content: body } = matter(raw);
    if (!fm["citation_id"]) continue;
    const baseMetadata: Omit<
      ChunkMetadata,
      "headingPath" | "chunkIndex" | "paragraphPath"
    > = {
      title: String(fm["title"] ?? ""),
      source: String(fm["source"] ?? ""),
      authority: String(
        fm["authority"] ?? "Kestrel",
      ) as ChunkMetadata["authority"],
      citationId: String(fm["citation_id"]),
      citationIdDisplay: String(fm["citation_id_display"] ?? ""),
      jurisdiction: String(
        fm["jurisdiction"] ?? "Internal",
      ) as ChunkMetadata["jurisdiction"],
      docType: String(fm["doc_type"] ?? "internal") as ChunkMetadata["docType"],
      effectiveDate: String(fm["effective_date"] ?? ""),
      sourceUrl: String(fm["source_url"] ?? ""),
      versionStatus: String(
        fm["version_status"] ?? "current",
      ) as ChunkMetadata["versionStatus"],
      topicTags: Array.isArray(fm["topic_tags"]) ? fm["topic_tags"].map(String) : [],
    };
    for (const c of chunkDocument(body, baseMetadata)) {
      out.set(c.id, c.text);
    }
  }
  return out;
}

function main(): void {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("Usage: pnpm tsx scripts/dump-chunk.ts <chunkId> [chunkId ...]");
    process.exit(2);
  }

  const index = indexCorpus(resolve(process.cwd(), "corpus"));
  for (const id of ids) {
    const text = index.get(id);
    console.log("=".repeat(80));
    console.log(id);
    console.log("=".repeat(80));
    if (text === undefined) {
      console.log("(NOT FOUND)");
    } else {
      console.log(text);
    }
    console.log();
  }
}

main();
