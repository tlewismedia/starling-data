/**
 * Wipe every record from the configured Pinecone index's default namespace.
 *
 * Use when chunk IDs change (e.g. after a chunker tweak) and you need to
 * rebuild from a clean slate so old IDs don't linger as orphans.
 *
 * Usage:
 *   pnpm reset-index            # prompts for confirmation
 *   pnpm reset-index --yes      # skip confirmation
 *
 * Required env vars: PINECONE_API_KEY, PINECONE_INDEX
 *
 * After this completes, run `pnpm ingest` to repopulate.
 */

import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import { createInterface } from "readline/promises";
import { stdin, stdout } from "process";

const PINECONE_API_KEY = process.env["PINECONE_API_KEY"];
const PINECONE_INDEX = process.env["PINECONE_INDEX"];

if (!PINECONE_API_KEY) {
  console.error("Missing env var: PINECONE_API_KEY");
  process.exit(1);
}
if (!PINECONE_INDEX) {
  console.error("Missing env var: PINECONE_INDEX");
  process.exit(1);
}

async function main(): Promise<void> {
  const pc = new Pinecone({ apiKey: PINECONE_API_KEY! });
  const index = pc.index(PINECONE_INDEX!);

  const stats = await index.describeIndexStats();
  const total = stats.totalRecordCount ?? 0;
  console.log(
    JSON.stringify({
      event: "before_reset",
      index: PINECONE_INDEX,
      total_records: total,
      namespaces: stats.namespaces ?? {},
    })
  );

  if (total === 0) {
    console.log("Index is already empty. Nothing to do.");
    return;
  }

  const skipConfirm = process.argv.includes("--yes");
  if (!skipConfirm) {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(
      `Delete all ${total} records from index '${PINECONE_INDEX}'? [type 'yes' to confirm] `
    );
    rl.close();
    if (answer.trim().toLowerCase() !== "yes") {
      console.log("Aborted.");
      process.exit(1);
    }
  }

  await index.deleteAll();
  console.log(JSON.stringify({ event: "delete_all_issued" }));

  // Pinecone deletes are eventually consistent on serverless. Poll until the
  // count drops to 0 (or give up after a reasonable wait).
  const startedAt = Date.now();
  const timeoutMs = 60_000;
  while (Date.now() - startedAt < timeoutMs) {
    const after = await index.describeIndexStats();
    const remaining = after.totalRecordCount ?? 0;
    if (remaining === 0) {
      console.log(
        JSON.stringify({
          event: "reset_complete",
          duration_ms: Date.now() - startedAt,
        })
      );
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.error(
    "Timed out waiting for record count to reach 0. Pinecone deletes are eventually consistent — re-check in a moment."
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
