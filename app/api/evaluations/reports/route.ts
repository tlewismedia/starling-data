import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import type {
  AnswerSummary,
  RetrievalSummary,
  SavedReportMeta,
} from "../../../_components/evaluation-types";

export const runtime = "nodejs";

/**
 * Saved-report persistence lives under `eval/saved-reports/`, one JSON file
 * per report. Files are tracked in git so reports function as shared team
 * baselines — see issue #74 and agents.md.
 *
 * Filenames: `<ISO-timestamp-with-hyphens>-<shortId>.json`.
 */
const REPORTS_DIR = resolve(process.cwd(), "eval/saved-reports");

// Strict allow-list: short-id uses alphanumerics only. Prevents path
// traversal when the id is embedded in a filename or file path.
const SHORT_ID_PATTERN = /^[A-Za-z0-9]+$/;

// The filename is `<timestamp>-<id>.json` where timestamp uses hyphens
// only (colons stripped), so we can use the same alphabet on the whole
// stem. This is the extra defence-in-depth check when we enumerate.
const FILENAME_PATTERN = /^[A-Za-z0-9-]+\.json$/;

interface PostBody {
  retrieval: RetrievalSummary | null;
  answer: AnswerSummary | null;
}

function filenameSafeTimestamp(iso: string): string {
  // ISO 8601 uses `:` which is unsafe on some filesystems (Windows, older
  // macOS). Replace `:` with `-`. Also replace the `.` before fractional
  // seconds so the filename stem stays in [A-Za-z0-9-] and the `.json`
  // extension is the only `.` in the name — keeps the allow-list regex
  // simple and defensible against traversal.
  return iso.replace(/:/g, "-").replace(/\./g, "-");
}

function generateShortId(): string {
  return randomBytes(4).toString("hex");
}

async function ensureDir(): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true });
}

/**
 * GET /api/evaluations/reports
 * Lists saved reports as `{ id, savedAt }[]` sorted by savedAt desc.
 */
export async function GET(): Promise<NextResponse> {
  try {
    await ensureDir();
    const entries = await readdir(REPORTS_DIR);
    const reports: SavedReportMeta[] = [];
    for (const name of entries) {
      if (!FILENAME_PATTERN.test(name)) continue;
      try {
        const raw = await readFile(resolve(REPORTS_DIR, name), "utf8");
        const parsed = JSON.parse(raw) as Partial<SavedReportMeta>;
        if (
          typeof parsed.id === "string" &&
          typeof parsed.savedAt === "string"
        ) {
          reports.push({ id: parsed.id, savedAt: parsed.savedAt });
        }
      } catch {
        // Skip malformed files — a broken file shouldn't kill the list.
      }
    }
    reports.sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0));
    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[api/evaluations/reports] GET error:", err);
    return NextResponse.json(
      { error: "Failed to list reports" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/evaluations/reports
 * Body: `{ retrieval, answer }` — both nullable but not both null.
 * Writes `eval/saved-reports/<timestamp>-<id>.json` and returns `{ id, savedAt }`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const retrieval = body.retrieval ?? null;
  const answer = body.answer ?? null;

  if (retrieval === null && answer === null) {
    return NextResponse.json(
      { error: "At least one of retrieval or answer must be provided" },
      { status: 400 },
    );
  }

  try {
    await ensureDir();
    const id = generateShortId();
    const savedAt = new Date().toISOString();
    const filename = `${filenameSafeTimestamp(savedAt)}-${id}.json`;
    // Extra safety: the filename must match our allowed pattern.
    if (!FILENAME_PATTERN.test(filename) || !SHORT_ID_PATTERN.test(id)) {
      throw new Error("Generated filename failed validation");
    }
    const filepath = resolve(REPORTS_DIR, filename);
    const payload = { id, savedAt, retrieval, answer };
    await writeFile(filepath, JSON.stringify(payload, null, 2) + "\n", "utf8");
    return NextResponse.json({ id, savedAt });
  } catch (err) {
    console.error("[api/evaluations/reports] POST error:", err);
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 },
    );
  }
}
