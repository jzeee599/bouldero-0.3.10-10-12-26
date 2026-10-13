import { test, expect } from "@playwright/test";
test("mobile destinations are separate and keep selected state during a session", async ({
  page,
}) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.goto("/");
  const nav = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(
    nav.getByRole("button", { name: "Session", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".mobile-lines-page")).toBeHidden();
  await nav.getByRole("button", { name: "Lines", exact: true }).click();
  await expect(page.locator(".mobile-lines-page")).toBeVisible();
  await expect(page.locator(".page-intro")).toBeHidden();
  await expect(
    nav.getByRole("button", { name: "Lines", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "Session", exact: true }).click();
  await page
    .getByRole("button", { name: "Start a session", exact: false })
    .click();
  await page.getByLabel("Gym", { exact: true }).fill("Navigation Test Gym");
  await page
    .getByLabel("Gym grading system", { exact: true })
    .selectOption("Font");
  await page.getByRole("button", { name: /Start session/ }).click();
  await expect(nav).toBeVisible();
  await page.getByRole("button", { name: "Find a line", exact: true }).click();
  await expect(
    nav.getByRole("button", { name: "Lines", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    nav.getByRole("button", { name: "History", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await nav.getByRole("button", { name: "Session", exact: true }).click();
  await expect(page.locator(".active-session-bar")).toBeVisible();
  await expect(
    nav.getByRole("button", { name: "Session", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("quick log stays attached to the active session while editing historical activity", async ({
  page,
}) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.goto("/");
  await page.locator(".data-tools-disclosure summary").click();
  await page.getByLabel("Import backup", { exact: true }).setInputFiles({
    name: "session-context.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        kind: "bouldero-backup",
        version: 2,
        exported_at: new Date().toISOString(),
        projects: [],
        attempts: [],
        gym_maps: [],
        sessions: [
          {
            id: "active-context",
            gym: "Active Gym",
            started_at: new Date(Date.now() - 60000).toISOString(),
            ended_at: null,
          },
          {
            id: "past-context",
            gym: "Past Gym",
            started_at: "2026-08-15T18:00:00.000Z",
            ended_at: "2026-08-15T20:30:00.000Z",
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("status")).toContainText("Imported");
  const nav = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await nav.getByRole("button", { name: "History", exact: true }).click();
  const past = page
    .locator(".session-entry")
    .filter({
      has: page.getByRole("heading", { name: "Past Gym", exact: true }),
    });
  await past.getByRole("button", { name: "Edit session", exact: true }).click();
  await past
    .getByRole("button", { name: "Edit session activity", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Past session", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Session elapsed time")).toBeVisible();
  await page.getByRole("button", { name: "Quick log", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Quick log" });
  await expect(sheet).toContainText("Active Gym");
  await sheet.getByRole("button", { name: "Blue", exact: true }).click();
  await sheet.getByRole("button", { name: "V1", exact: true }).click();
  await sheet.getByRole("button", { name: "Add attempt", exact: true }).click();
  await expect(sheet.getByRole("status")).toContainText("saved");
  await sheet.getByRole("button", { name: "Close quick log" }).click();
  await nav.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page
      .locator(".session-entry")
      .filter({
        has: page.getByRole("heading", { name: "Active Gym", exact: true }),
      })
      .locator(".session-summary"),
  ).toContainText("1 attempt");
  await expect(past.locator(".session-summary")).toContainText("0 attempts");
});
