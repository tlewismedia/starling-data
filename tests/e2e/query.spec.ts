import { test, expect } from "@playwright/test";

const hasCreds =
  !!process.env.PINECONE_API_KEY && !!process.env.ANTHROPIC_API_KEY;

test.describe("Compliance Copilot UI", () => {
  test.skip(!hasCreds, "Skipping E2E: API creds not set");

  test("submits a query and renders an answer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox").fill(
      "What are the baseline requirements for cyber incident detection?"
    );
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page.getByText("Thinking…")).toBeVisible();
    await expect(page.getByText("Thinking…")).not.toBeVisible({ timeout: 30_000 });
    const answer = page.locator("[data-testid='answer']");
    await expect(answer).toBeVisible();
    await expect(answer).not.toBeEmpty();
  });
});
