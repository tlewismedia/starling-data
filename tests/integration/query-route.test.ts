import { describe, it, expect } from "vitest";
import { isInsufficientCredits } from "../../app/api/query/route";

const REFUSAL = "I cannot answer from the available sources.";

describe("isInsufficientCredits", () => {
  it("matches a credit_balance_exhausted 429 error", () => {
    expect(
      isInsufficientCredits({
        status: 429,
        code: "credit_balance_exhausted",
        type: "insufficient_quota",
      }),
    ).toBe(true);
  });

  it("matches when only type is insufficient_quota", () => {
    expect(isInsufficientCredits({ status: 429, type: "insufficient_quota" })).toBe(
      true,
    );
  });

  it("rejects a generic 429 (rate limit)", () => {
    expect(
      isInsufficientCredits({ status: 429, code: "rate_limit_exceeded" }),
    ).toBe(false);
  });

  it("rejects non-429 errors and non-objects", () => {
    expect(isInsufficientCredits({ status: 500, type: "server_error" })).toBe(false);
    expect(isInsufficientCredits("429 no credits remaining")).toBe(false);
    expect(isInsufficientCredits(null)).toBe(false);
  });
});

describe.skipIf(!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY)(
  "/api/query route integration",
  () => {
    it("returns a grounded, cited answer for a compliance question", { timeout: 30_000 }, async () => {
      const { POST } = await import("../../app/api/query/route");
      const req = new Request("http://localhost/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query:
            "Under FINRA Rule 3110, what supervisory system must a member firm establish for its associated persons?",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(typeof body.answer).toBe("string");
      expect(body.answer).not.toContain(REFUSAL);
      expect(body.answer).toMatch(/\[\^\d+\]/);
      expect(Array.isArray(body.citations)).toBe(true);
      expect(body.citations.length).toBeGreaterThan(0);
    });
  }
);
