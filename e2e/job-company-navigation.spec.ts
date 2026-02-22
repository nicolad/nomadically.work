import { test, expect } from "@playwright/test";

const JOB_URL =
  "/jobs/7d4b6e9a-5383-4604-a958-1fea0d5c41fa?company=alaro&source=ashby";

test.describe("job detail — company link navigation", () => {
  test("company link includes source=ashby query param", async ({ page }) => {
    await page.goto(JOB_URL);

    // Wait for the job title heading to appear
    await expect(
      page.getByRole("heading", { name: "AI Engineer @ Alaro", level: 1 })
    ).toBeVisible();

    // The company link is the "alaro" text link below the job title
    const companyLink = page.getByRole("link", { name: "alaro", exact: true });

    const href = await companyLink.getAttribute("href");
    expect(href).toMatch(/^\/companies\//);
    expect(href).toContain("source=ashby");
  });

  test("clicking company link navigates to company page with source param", async ({
    page,
  }) => {
    await page.goto(JOB_URL);

    await expect(
      page.getByRole("heading", { name: "AI Engineer @ Alaro", level: 1 })
    ).toBeVisible();

    await page.getByRole("link", { name: "alaro", exact: true }).click();

    // Should navigate to /companies/<key>?source=ashby
    await expect(page).toHaveURL(/\/companies\/.+\?source=ashby/);
  });
});
