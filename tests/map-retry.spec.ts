import { test, expect } from "@playwright/test";

// Keep interaction regressions independent of the external font service.
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
});

test("gym map load failure exposes retry and recovers", async ({ page }) => {
  await page.goto("/");
  await page.locator(".data-tools-disclosure summary").click();
  await page
    .getByRole("button", { name: "Import backup", exact: true })
    .setInputFiles({
      name: "map-test.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          kind: "bouldero-backup",
          version: 2,
          exported_at: new Date().toISOString(),
          projects: [],
          sessions: [],
          attempts: [],
          gym_maps: [
            {
              id: "retry-map",
              gym: "Retry Gym",
              image_url: "/missing-map-test.svg",
              image_data: null,
              markers: [],
              updated_at: new Date().toISOString(),
            },
          ],
        }),
      ),
    });
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Gym", exact: true })
    .selectOption("Retry Gym");
  await expect(page.getByRole("button", { name: "Retry map" })).toBeVisible();
  await page.route("**/missing-map-test.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="gray"/></svg>',
    }),
  );
  await page.getByRole("button", { name: "Retry map" }).click();
  await expect(page.locator(".gym-map-canvas")).toHaveClass(/is-ready/);
  await expect(page.getByText("Loading gym map…")).toHaveCount(0);
});
