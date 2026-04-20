/**
 * Round-trip test for the saved-report API:
 *   POST /api/evaluations/reports        → creates a file and returns meta
 *   GET  /api/evaluations/reports        → lists metas sorted desc
 *   GET  /api/evaluations/reports/[id]   → returns the full saved report
 *
 * Also exercises the 400/404 edge cases called out in issue #74 AC7.
 *
 * The route handlers read/write `eval/saved-reports/` under `process.cwd()`.
 * We redirect `process.cwd()` to a per-test tmp dir so real reports aren't
 * clobbered. Fresh module imports pick up the redirected cwd because the
 * REPORTS_DIR path resolves at import time.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";

import type {
  AnswerSummary,
  RetrievalSummary,
  SavedReport,
  SavedReportMeta,
} from "../../app/_components/evaluation-types";

const retrievalFixture: RetrievalSummary = {
  total: 3,
  mrr: 0.82,
  ndcg: 0.88,
  keywordCoverage: 0.74,
  pinpointPrecision: 0.51,
  categories: [
    { category: "books-and-records", avgMrr: 0.9, count: 2 },
    { category: "disclosures", avgMrr: 0.7, count: 1 },
  ],
};

const answerFixture: AnswerSummary = {
  total: 3,
  accuracy: 4.4,
  completeness: 4.1,
  relevance: 4.7,
  categories: [{ category: "disclosures", avgAccuracy: 4.5, count: 3 }],
};

let tmpRoot: string;
let cwdSpy: ReturnType<typeof vi.spyOn> | null = null;

async function loadRoutes() {
  // `vi.resetModules()` ensures each test gets a fresh copy of the route
  // module — the REPORTS_DIR constant in the module binds to cwd at import
  // time, so we must re-import after swapping cwd.
  vi.resetModules();
  const list = await import("../../app/api/evaluations/reports/route");
  const byId = await import("../../app/api/evaluations/reports/[id]/route");
  return { list, byId };
}

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "reports-route-"));
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmpRoot);
});

afterEach(() => {
  cwdSpy?.mockRestore();
  cwdSpy = null;
  rmSync(tmpRoot, { recursive: true, force: true });
  vi.resetModules();
});

describe("POST /api/evaluations/reports", () => {
  it("persists a JSON file and returns {id, savedAt}", async () => {
    const { list } = await loadRoutes();
    const req = new Request("http://localhost/api/evaluations/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retrieval: retrievalFixture, answer: answerFixture }),
    });
    const res = await list.POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as SavedReportMeta;
    expect(typeof body.id).toBe("string");
    expect(body.id).toMatch(/^[A-Za-z0-9]+$/);
    expect(typeof body.savedAt).toBe("string");
    expect(new Date(body.savedAt).toString()).not.toBe("Invalid Date");

    const dir = resolve(tmpRoot, "eval/saved-reports");
    const files = await readdir(dir);
    expect(files).toHaveLength(1);
    const raw = await readFile(resolve(dir, files[0]!), "utf8");
    const saved = JSON.parse(raw) as SavedReport;
    expect(saved.id).toBe(body.id);
    expect(saved.retrieval).toEqual(retrievalFixture);
    expect(saved.answer).toEqual(answerFixture);
  });

  it("accepts a retrieval-only save", async () => {
    const { list } = await loadRoutes();
    const req = new Request("http://localhost/api/evaluations/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retrieval: retrievalFixture, answer: null }),
    });
    const res = await list.POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 when both summaries are null", async () => {
    const { list } = await loadRoutes();
    const req = new Request("http://localhost/api/evaluations/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retrieval: null, answer: null }),
    });
    const res = await list.POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const { list } = await loadRoutes();
    const req = new Request("http://localhost/api/evaluations/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await list.POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/evaluations/reports", () => {
  it("lists saved reports sorted by savedAt descending", async () => {
    const { list } = await loadRoutes();
    // POST two reports a moment apart to get distinct timestamps.
    const first = await list.POST(
      new Request("http://localhost/api/evaluations/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retrieval: retrievalFixture, answer: null }),
      }),
    );
    const firstMeta = (await first.json()) as SavedReportMeta;
    await new Promise((r) => setTimeout(r, 10));
    const second = await list.POST(
      new Request("http://localhost/api/evaluations/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retrieval: null, answer: answerFixture }),
      }),
    );
    const secondMeta = (await second.json()) as SavedReportMeta;

    const res = await list.GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reports: SavedReportMeta[] };
    expect(body.reports).toHaveLength(2);
    // Newest first.
    expect(body.reports[0]!.id).toBe(secondMeta.id);
    expect(body.reports[1]!.id).toBe(firstMeta.id);
  });

  it("returns an empty list when the directory is empty", async () => {
    const { list } = await loadRoutes();
    const res = await list.GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reports: SavedReportMeta[] };
    expect(body.reports).toEqual([]);
  });
});

describe("GET /api/evaluations/reports/[id]", () => {
  it("round-trips: POST then fetch by id returns the full body", async () => {
    const { list, byId } = await loadRoutes();
    const posted = await list.POST(
      new Request("http://localhost/api/evaluations/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retrieval: retrievalFixture, answer: answerFixture }),
      }),
    );
    const meta = (await posted.json()) as SavedReportMeta;

    const res = await byId.GET(
      new Request(`http://localhost/api/evaluations/reports/${meta.id}`),
      { params: Promise.resolve({ id: meta.id }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as SavedReport;
    expect(body.id).toBe(meta.id);
    expect(body.savedAt).toBe(meta.savedAt);
    expect(body.retrieval).toEqual(retrievalFixture);
    expect(body.answer).toEqual(answerFixture);
  });

  it("returns 404 for an unknown id", async () => {
    const { byId } = await loadRoutes();
    const res = await byId.GET(
      new Request("http://localhost/api/evaluations/reports/deadbeef"),
      { params: Promise.resolve({ id: "deadbeef" }) },
    );
    expect(res.status).toBe(404);
  });

  it.each([
    ["../etc/passwd"],
    ["foo/bar"],
    ["foo.bar"],
    ["."],
    [".."],
    ["has space"],
    ["dash-id"],
    [""],
  ])("rejects non-alphanumeric id %j with 400", async (id) => {
    const { byId } = await loadRoutes();
    const res = await byId.GET(
      new Request(`http://localhost/api/evaluations/reports/${encodeURIComponent(id)}`),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(400);
  });
});
