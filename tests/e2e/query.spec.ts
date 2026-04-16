import { test, expect } from "@playwright/test";

const hasCreds =
  !!process.env.PINECONE_API_KEY && !!process.env.OPENAI_API_KEY;

test.describe("Compliance Copilot UI", () => {
  test.skip(!hasCreds, "Skipping E2E: API creds not set");

  const REFUSAL = "I cannot answer from the available sources.";

  test("submits a query and renders a grounded, cited answer", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("textbox").fill(
      "Under Regulation Z 12 CFR 1026.18, what must a creditor disclose about the finance charge and annual percentage rate for closed-end credit?",
    );
    await page.getByRole("button", { name: /^ask$/i }).click();

    await expect(page.getByText("Thinking…").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Thinking…").first()).not.toBeVisible({
      timeout: 30_000,
    });

    const answer = page.locator("[data-testid='answer']");
    await expect(answer).toBeVisible();

    const answerText = (await answer.innerText()).trim();
    expect(answerText).not.toContain(REFUSAL);
    expect(answerText.length).toBeGreaterThan(80);
    expect(answerText).toMatch(/\d/);

    // Panel is closed by default — an "Open citations" affordance should show.
    const openCitations = page.getByRole("button", { name: /citations \(/i });
    await expect(openCitations).toBeVisible();

    // Click a citation chip inside the answer to open the panel.
    await answer.getByRole("button", { name: /open citation/i }).first().click();

    const panel = page.locator("[data-testid='citations-panel']");
    await expect(panel).toBeVisible();
    await expect(panel.locator("article")).not.toHaveCount(0);

    // Trace section is collapsed by default but its header must be present.
    const trace = page.locator("[data-testid='trace']");
    await expect(trace).toBeVisible();
  });

  test("renders a focused question card on first paint with panel closed", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid='question-card']")).toBeVisible();
    // No result yet, so no open-citations affordance.
    await expect(
      page.getByRole("button", { name: /citations \(/i }),
    ).toHaveCount(0);
    await expect(page.locator("[data-testid='trace']")).toHaveCount(0);
  });

  test("citation numbers are sequential starting at 1", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("textbox").fill(
      "Under Regulation Z 12 CFR 1026.18, what must a creditor disclose about the finance charge and annual percentage rate for closed-end credit?",
    );
    await page.getByRole("button", { name: /^ask$/i }).click();

    await expect(page.getByText("Thinking…").first()).not.toBeVisible({
      timeout: 30_000,
    });

    const answer = page.locator("[data-testid='answer']");
    await expect(answer).toBeVisible();
    const chips = answer.getByRole("button", { name: /open citation/i });
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);
    const first = (await chips.first().innerText()).trim();
    expect(first).toBe("1");
  });
});
