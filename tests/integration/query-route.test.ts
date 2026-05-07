import { describe, it, expect } from "vitest";

const REFUSAL = "I cannot answer from the available sources.";

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
