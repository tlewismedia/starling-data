import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { resolve } from "path";
import type { SavedReport } from "../../../../_components/evaluation-types";

export const runtime = "nodejs";

const REPORTS_DIR = resolve(process.cwd(), "eval/saved-reports");

// Strict allow-list: the id is embedded in a filename and used to look up
// a file on disk — anything outside `[A-Za-z0-9]` is rejected so that
// `/`, `.`, `..`, and similar traversal tokens can't reach the filesystem.
const SHORT_ID_PATTERN = /^[A-Za-z0-9]+$/;

const FILENAME_PATTERN = /^[A-Za-z0-9-]+\.json$/;

/**
 * GET /api/evaluations/reports/[id]
 * Returns the full `SavedReport` for the given id, or 404 if no file
 * contains that id.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  if (typeof id !== "string" || !SHORT_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  try {
    const entries = await readdir(REPORTS_DIR);
    // Filenames end with `-<id>.json`. Match exactly to avoid hitting
    // another report whose id is a substring of this one.
    const match = entries.find(
      (name) => FILENAME_PATTERN.test(name) && name.endsWith(`-${id}.json`),
    );
    if (!match) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const raw = await readFile(resolve(REPORTS_DIR, match), "utf8");
    const parsed = JSON.parse(raw) as SavedReport;
    if (parsed.id !== id) {
      // Filename and embedded id disagree — treat as not found rather
      // than returning a mismatched body.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(parsed);
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr && nodeErr.code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[api/evaluations/reports/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 },
    );
  }
}
