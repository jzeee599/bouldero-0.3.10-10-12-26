import { test, expect, type Page } from "@playwright/test";

// Keep interaction regressions independent of the external font service.
test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
});

async function showLines(page: Page) {
  const nav = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: "Lines", exact: true }).click();
}
async function showSession(page: Page) {
  const nav = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: "Session", exact: true }).click();
}
async function showDataTools(page: Page) {
  await showSession(page);
  const tools = page.locator(".data-tools-disclosure");
  if ((await tools.getAttribute("open")) === null)
    await tools.locator("summary").click();
}

async function upload(
  page: Page,
  width = 800,
  height = 1200,
  mode: "mapped" | "count_only" = "mapped",
) {
  await page.goto("/");
  await page.getByRole("button", { name: /New line/ }).click();
  // A generated image with visible hold-like dots makes tests self-contained.
  const bytes = await page.evaluate(
    ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#b8b2a0";
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = i % 2 ? "#915574" : "#b3c269";
        ctx.beginPath();
        ctx.ellipse(
          width * (0.2 + (i % 3) * 0.28),
          height * (0.12 + Math.floor(i / 3) * 0.17),
          27,
          15,
          0.4,
          0,
          7,
        );
        ctx.fill();
      }
      return canvas.toDataURL("image/jpeg").split(",")[1];
    },
    { width, height },
  );
  await page.getByLabel("Choose a photo", { exact: true }).setInputFiles({
    name: "route.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(bytes, "base64"),
  });
  await page
    .getByRole("button", {
      name: mode === "mapped" ? /Map holds/ : /Reps only/,
    })
    .click();
  await expect(page.getByTestId("photo-map").locator("img")).toBeVisible();
  await page
    .getByTestId("photo-map")
    .locator("img")
    .evaluate((img: HTMLImageElement) => img.decode());
}
async function add(page: Page, x: number, y: number) {
  const map = page.getByTestId("photo-map");
  await map.scrollIntoViewIfNeeded();
  const box = (await map.boundingBox())!;
  await map
    .locator("img")
    .click({ position: { x: box.width * x, y: box.height * y } });
}
async function assertPosition(page: Page, index: number, x: number, y: number) {
  const map = (await page.getByTestId("photo-map").boundingBox())!;
  const marker = (await page.getByTestId(`hold-${index}`).boundingBox())!;
  expect(
    Math.abs((marker.x + marker.width / 2 - map.x) / map.width - x),
  ).toBeLessThan(0.005);
  expect(
    Math.abs((marker.y + marker.height / 2 - map.y) / map.height - y),
  ).toBeLessThan(0.005);
}

test("15 holds survive save, reload, and phone/desktop/landscape resizing", async ({
  page,
}) => {
  await upload(page);
  const points = Array.from({ length: 15 }, (_, i) => ({
    x: 0.2 + (i % 3) * 0.28,
    y: 0.12 + Math.floor(i / 3) * 0.17,
  }));
  for (const point of points) await add(page, point.x, point.y);
  await expect(page.getByRole("button", { name: /^Hold / })).toHaveCount(15);
  await page.getByLabel("Color").fill("Purple");
  await page.getByLabel("Grade", { exact: true }).fill("V4");
  await page.getByRole("button", { name: /Finish hold/ }).click();
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await expect(page.getByRole("heading", { name: "Purple V4" })).toBeVisible();
  await page.reload();
  await showLines(page);
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Lines", exact: true })
    .click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Purple V4/ })
    .click();
  for (const size of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
    { width: 844, height: 390 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(size);
    for (const [i, point] of points.entries())
      await assertPosition(page, i + 1, point.x, point.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByRole("button", { name: "Hold 15, TOP", exact: true }),
  ).toBeVisible();
});

test("zooms the route photo without resizing the page frame", async ({
  page,
}) => {
  await upload(page);
  const frameBefore = (await page.getByTestId("photo-map").boundingBox())!;
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByRole("button", { name: "Reset zoom" })).toHaveText(
    "125%",
  );
  await expect(page.getByTestId("photo-map-canvas")).toHaveAttribute(
    "style",
    /scale\(1\.25\)/,
  );
  const photo = page.getByTestId("photo-map");
  const photoBox = (await photo.boundingBox())!;
  await page.mouse.move(
    photoBox.x + photoBox.width / 2,
    photoBox.y + photoBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    photoBox.x + photoBox.width / 2 + 35,
    photoBox.y + photoBox.height / 2 + 20,
  );
  await page.mouse.up();
  await expect(page.getByTestId("photo-map-canvas")).toHaveAttribute(
    "style",
    /translate\((?!0px, 0px)/,
  );
  const frameAfter = (await page.getByTestId("photo-map").boundingBox())!;
  expect(frameAfter.width).toBeCloseTo(frameBefore.width, 1);
  expect(frameAfter.height).toBeCloseTo(frameBefore.height, 1);
  await page.getByRole("button", { name: "Reset zoom" }).click();
  await expect(page.getByRole("button", { name: "Reset zoom" })).toHaveText(
    "100%",
  );
  await expect(page.getByTestId("photo-map-canvas")).toHaveAttribute(
    "style",
    /translate\(0px, 0px\)/,
  );
});

test("drag, keyboard nudge, delete, undo, and TOP semantics", async ({
  page,
}) => {
  await upload(page, 1200, 800);
  await add(page, 0.2, 0.3);
  await add(page, 0.5, 0.5);
  await add(page, 0.8, 0.7);
  await page.getByRole("button", { name: /Finish hold/ }).click();
  await expect(
    page.getByRole("button", { name: "Hold 3, TOP", exact: true }),
  ).toBeVisible();
  const marker = page.getByTestId("hold-1");
  await marker.scrollIntoViewIfNeeded();
  let box = (await page.getByTestId("photo-map").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4, {
    steps: 5,
  });
  await page.mouse.up();
  await assertPosition(page, 1, 0.35, 0.4);
  await marker.focus();
  await page.keyboard.press("ArrowRight");
  await assertPosition(page, 1, 0.355, 0.4);
  await page.getByTestId("hold-2").click();
  await page.getByRole("button", { name: "Delete selected" }).click();
  await expect(
    page.getByRole("button", { name: "Hold 2, TOP", exact: true }),
  ).toBeVisible();
  await add(page, 0.5, 0.8);
  await expect(page.getByRole("button", { name: /Finish hold/ })).toHaveClass(
    /selected-result/,
  );
  await page.getByRole("button", { name: "Undo last hold" }).click();
  await expect(page.getByRole("button", { name: /^Hold / })).toHaveCount(2);
  await page.getByTestId("hold-1").scrollIntoViewIfNeeded();
  box = (await page.getByTestId("photo-map").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.355, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x - 15, box.y + box.height * 0.2, { steps: 5 });
  await page.mouse.up();
  await assertPosition(page, 1, 0, 0.2);
});

test("requires color, grade, and hold; failed persistence retains editable draft", async ({
  page,
}) => {
  await upload(page);
  const save = page.getByRole("button", { name: /Done · Save line/ });
  await expect(save).toBeDisabled();
  await page.getByLabel("Color").fill("Orange");
  await page.getByLabel("Grade", { exact: true }).fill("V3");
  await expect(save).toBeDisabled();
  await add(page, 0.5, 0.5);
  await expect(save).toBeEnabled();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      IDBObjectStore.prototype.put = original;
      throw new Error("Test: storage full");
    };
  });
  await save.click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "storage full",
  );
  await expect(page.getByLabel("Color")).toHaveValue("Orange");
  await expect(page.getByTestId("hold-1")).toBeVisible();
  await save.click();
  await expect(page.getByRole("heading", { name: "Orange V3" })).toBeVisible();
});

test("invalid image reports an actionable error", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /New line/ }).click();
  await page.getByLabel("Choose a photo", { exact: true }).setInputFiles({
    name: "broken.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "could not be opened",
  );
});

test("can replace a selected photo and save notes on the line", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.45, 0.6);
  await page.getByLabel("Choose a different photo").setInputFiles({
    name: "replacement.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 500;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#547c85";
        context.fillRect(0, 0, 500, 500);
        return canvas.toDataURL("image/jpeg").split(",")[1];
      }),
      "base64",
    ),
  });
  await expect(
    page.getByRole("button", { name: "Remove selected photo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove selected photo" }).click();
  await expect(
    page.getByLabel("Choose a photo", { exact: true }),
  ).toBeAttached();
  await page.getByLabel("Choose a photo", { exact: true }).setInputFiles({
    name: "replacement.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 500;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#547c85";
        context.fillRect(0, 0, 500, 500);
        return canvas.toDataURL("image/jpeg").split(",")[1];
      }),
      "base64",
    ),
  });
  await expect(page.getByRole("button", { name: /Map holds/ })).toBeVisible();
  await page.getByRole("button", { name: /Map holds/ }).click();
  await expect(page.getByRole("button", { name: /^Hold / })).toHaveCount(0);
  await add(page, 0.5, 0.4);
  await page.getByLabel("Color").fill("Teal");
  await page.getByLabel("Grade", { exact: true }).fill("V3");
  await page
    .getByLabel("Line notes optional")
    .fill("Right wrist hurts at the start. Use the high left foot.");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await expect(
    page.getByText("Right wrist hurts at the start. Use the high left foot."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit notes" }).click();
  await page
    .getByLabel("Edit line notes")
    .fill("Updated beta: keep the left foot high and rest first.");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(
    page.getByRole("button", { name: "Save notes", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Updated beta: keep the left foot high and rest first."),
  ).toBeVisible();
  await page.reload();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Teal V3/ })
    .click();
  await expect(
    page.getByText("Updated beta: keep the left foot high and rest first."),
  ).toBeVisible();
});

test("limits reusable photos to the selected gym", async ({ page }) => {
  await upload(page);
  await add(page, 0.5, 0.5);
  await page.getByLabel("Color").fill("Indigo");
  await page.getByLabel("Grade", { exact: true }).fill("V2");
  await page.getByLabel("Gym optional").fill("North Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page.locator(".back-button").click();
  await page.getByRole("button", { name: /New line/ }).click();

  await page.getByLabel("Gym for photo reuse").fill("South Gym");
  await expect(
    page
      .locator(".saved-photo-strip")
      .getByRole("button", { name: /Indigo V2/ }),
  ).toHaveCount(0);
  await page.getByLabel("Gym for photo reuse").fill("North Gym");
  await expect(
    page
      .locator(".saved-photo-strip")
      .getByRole("button", { name: /Indigo V2/ }),
  ).toBeVisible();
});

test("replaces a saved line photo and persists its new hold map", async ({
  page,
}) => {
  await upload(page, 600, 900);
  await add(page, 0.4, 0.6);
  await page.getByLabel("Color").fill("Copper");
  await page.getByLabel("Grade", { exact: true }).fill("V3");
  await page.getByLabel("Gym optional").fill("Edit Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page.getByRole("button", { name: "Edit line & holds" }).click();

  const replacement = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 600;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#9a6f47";
    context.fillRect(0, 0, 1200, 600);
    return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  await page.getByLabel("Choose a different photo").setInputFiles({
    name: "wide-wall.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(replacement, "base64"),
  });
  await page.getByRole("button", { name: /Map holds/ }).click();
  await add(page, 0.7, 0.4);
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Copper V3/ })
    .click();
  await expect(page.getByTestId("hold-1")).toBeVisible();
  const ratio = await page
    .getByTestId("photo-map")
    .locator("img")
    .evaluate(
      (image: HTMLImageElement) => image.naturalWidth / image.naturalHeight,
    );
  expect(ratio).toBeGreaterThan(1.5);
});

test("exports and imports lines, photos, sessions, attempts, and notes", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.5, 0.5);
  await page.getByLabel("Color").fill("Silver");
  await page.getByLabel("Grade", { exact: true }).fill("V2");
  await page.getByLabel("Line notes optional").fill("Backup test beta.");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await showDataTools(page);
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("bouldero-v1");
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await showLines(page);
  await expect(page.getByRole("button", { name: /Silver V2/ })).toHaveCount(0);
  await showDataTools(page);
  await page.getByLabel("Import backup").setInputFiles(backupPath!);
  await expect(
    page.getByText(/Imported 1 lines, 0 sessions, and 0 attempts/),
  ).toBeVisible();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Silver V2/ })
    .click();
  await expect(page.getByText("Backup test beta.")).toBeVisible();
  await expect(page.getByTestId("photo-map").locator("img")).toBeVisible();
});

test("places a line on a gym map and restores the map from backup", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await upload(page);
  await add(page, 0.45, 0.55);
  await page.getByLabel("Color").fill("Teal");
  await page.getByLabel("Wall area", { exact: true }).fill("Island back");
  await page.getByLabel("Grade", { exact: true }).fill("V2");
  await page.getByLabel("Gym optional").fill("Map Test Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();

  const mapBytes = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e4e6d9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#7f8e75";
    ctx.fillRect(120, 100, 660, 400);
    return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  await page.locator(".gym-map-uploader input").setInputFiles({
    name: "gym-map.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(mapBytes, "base64"),
  });
  await expect(page.getByAltText("Map Test Gym map")).toBeVisible();
  await expect(
    page.getByText("Browse mode · Tap a line to open its details."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit map" }).click();
  await expect(
    page.getByText("Edit mode · Placement and marker movement are unlocked."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit map" })).toHaveCSS(
    "background-color",
    "rgb(227, 233, 216)",
  );
  await page
    .locator(".gym-map-line-card")
    .filter({ hasText: "Teal V2" })
    .click();
  const map = page.locator(".gym-map-canvas");
  const mapBox = (await map.boundingBox())!;
  await map.click({
    position: { x: mapBox.width * 0.35, y: mapBox.height * 0.6 },
  });
  const tealMarker = page.getByRole("button", { name: /Select Teal V2/ });
  await expect(tealMarker).toBeVisible();
  await expect(tealMarker.locator("span")).toHaveText("V2");
  await expect(tealMarker).toHaveCSS("background-color", "rgb(0, 128, 128)");
  const tealBox = (await tealMarker.boundingBox())!;
  await page.mouse.move(
    tealBox.x + tealBox.width / 2,
    tealBox.y + tealBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    mapBox.x + mapBox.width * 0.42,
    mapBox.y + mapBox.height * 0.66,
  );
  await page.mouse.up();
  await expect(tealMarker).toHaveAttribute("style", /left: 42/);

  await page.getByRole("button", { name: /Add a line here/ }).click();
  await map.click({
    position: { x: mapBox.width * 0.72, y: mapBox.height * 0.35 },
  });
  await expect(page.getByLabel("Gym for photo reuse")).toHaveValue(
    "Map Test Gym",
  );
  await page
    .locator(".saved-photo-strip")
    .getByRole("button", { name: /Teal V2/ })
    .click();
  await page.getByRole("button", { name: /Map holds/ }).click();
  await add(page, 0.55, 0.45);
  await page.getByLabel("Color").fill("Orange");
  await page.getByLabel("Wall area", { exact: true }).fill("Island front");
  await page.getByLabel("Grade", { exact: true }).fill("V3");
  await expect(page.locator(".creation-map-canvas > span")).toHaveText("NEW");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page.getByRole("button", { name: /Gym map/ }).click();
  await page.getByRole("button", { name: "Browse", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Open Orange V3/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Back/ }).click();
  await page.getByRole("button", { name: /New line/ }).click();
  await page.getByLabel("Gym for photo reuse").fill("Map Test Gym");
  await page
    .locator(".saved-photo-strip")
    .getByRole("button", { name: /Teal V2/ })
    .click();
  await page.getByRole("button", { name: /Map holds/ }).click();
  await add(page, 0.45, 0.42);
  await page.getByLabel("Color").fill("Purple");
  await page.getByLabel("Wall area", { exact: true }).fill("Island front");
  await page.getByLabel("Grade", { exact: true }).fill("V5");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit map" }).click();
  await page.getByRole("button", { name: "Quick map 1 lines" }).click();
  await expect(page.locator(".quick-map-current")).toContainText("Purple V5");
  const quickMap = page.locator(".gym-map-canvas");
  const quickMapBox = (await quickMap.boundingBox())!;
  await quickMap.click({
    position: { x: quickMapBox.width * 0.5, y: quickMapBox.height * 0.25 },
  });
  await expect(page.getByText("Quick mapping complete.")).toBeVisible();
  await page.getByRole("button", { name: "Undo last" }).click();
  await expect(page.locator(".quick-map-current")).toContainText("Purple V5");
  await quickMap.click({
    position: { x: quickMapBox.width * 0.52, y: quickMapBox.height * 0.27 },
  });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Browse", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Open Purple V5/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByLabel("Map zoom level")).toHaveText("150%");
  await page.getByRole("button", { name: /Open Orange V3/ }).click();
  await page.getByRole("button", { name: /Gym map/ }).click();
  await expect(
    page.getByRole("button", { name: "Browse", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Map zoom level")).toHaveText("150%");

  await page.getByRole("button", { name: /Back/ }).click();
  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Map Test Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Purple V5/ })
    .first()
    .click();
  await page.getByRole("button", { name: /^Add attempt/ }).click();
  await page
    .getByRole("button", { name: /Back to lines|Back to session/ })
    .click();
  await showSession(page);
  const sameWall = page.getByLabel("Same wall area lines");
  await expect(sameWall).toContainText("Assigned wall area: Island front");
  await expect(sameWall).toContainText("Orange V3");
  await expect(sameWall).not.toContainText("Teal V2");
  await sameWall.getByRole("button", { name: /Orange V3/ }).click();
  await expect(page.getByRole("heading", { name: "Orange V3" })).toBeVisible();
  await page.locator(".back-button").click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  await expect(page.getByAltText("Map Test Gym map")).toBeVisible();

  await page.getByRole("button", { name: /Open Teal V2/ }).click();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.locator(".pill")).toHaveText("Archived");
  await page.reload();
  await showLines(page);
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Open Teal V2/ })).toHaveCount(
    0,
  );
  await expect(page.locator(".gym-map-visible-lines")).not.toContainText(
    "Teal V2",
  );
  await expect(
    page.getByRole("button", { name: /Open Orange V3/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Back/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await showDataTools(page);
  await page.getByRole("button", { name: "Export backup" }).click();
  const backupPath = await (await downloadPromise).path();
  expect(backupPath).toBeTruthy();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("bouldero-v1");
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await showLines(page);
  await showDataTools(page);
  await page.getByLabel("Import backup").setInputFiles(backupPath!);
  await expect(
    page.getByText(/3 lines, 1 sessions, and 1 attempts.*1 gym maps included/),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  await expect(page.getByAltText("Map Test Gym map")).toBeVisible();
  await expect(page.getByRole("button", { name: /Open Teal V2/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /Open Orange V3/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Open Purple V5/ }),
  ).toBeVisible();
});

test("offers a cleaned pilot map without losing existing markers", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.45, 0.55);
  await page.getByLabel("Color").fill("Blue");
  await page.getByLabel("Grade", { exact: true }).fill("V3");
  await page.getByLabel("Gym optional").fill("Movement Santa Clara");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();

  const uploadedMap = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    canvas.getContext("2d")!.fillRect(0, 0, 800, 600);
    return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  await page.locator(".gym-map-uploader input").setInputFiles({
    name: "santa-clara-source.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(uploadedMap, "base64"),
  });
  await page.getByRole("button", { name: "Edit map" }).click();
  await page
    .locator(".gym-map-line-card")
    .filter({ hasText: "Blue V3" })
    .click();
  const map = page.locator(".gym-map-canvas");
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width * 0.4, y: box.height * 0.45 } });
  const marker = page.getByRole("button", { name: /Select Blue V3/ });
  await expect(marker).toBeVisible();

  await page.getByRole("button", { name: "Review cleaned pilot map" }).click();
  await expect(page.getByText("CLEANED PILOT MAP")).toBeVisible();
  await expect(
    page.getByAltText("Movement Santa Clara cleaned map"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Compare source" }).click();
  await expect(
    page.getByAltText("Movement Santa Clara source photo"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use cleaned map" }).click();
  await expect(page.getByAltText("Movement Santa Clara map")).toHaveAttribute(
    "src",
    /gym-maps\/cleaned\/movement-santa-clara-first-floor\.png/,
  );
  await expect(marker).toBeVisible();

  await page.getByRole("button", { name: "Browse", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Open Blue V3/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Back/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await showDataTools(page);
  await page.getByRole("button", { name: "Export backup" }).click();
  const backupPath = await (await downloadPromise).path();
  expect(backupPath).toBeTruthy();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase("bouldero-v1");
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await showLines(page);
  await showDataTools(page);
  await page.getByLabel("Import backup").setInputFiles(backupPath!);
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  await expect(page.getByAltText("Movement Santa Clara map")).toHaveAttribute(
    "src",
    /gym-maps\/cleaned\/movement-santa-clara-first-floor\.png/,
  );
  await expect(
    page.getByRole("button", { name: /Open Blue V3/ }),
  ).toBeVisible();
});

test("exposes both pilot gyms on a fresh device", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  const gymSelect = page.getByRole("combobox", { name: "Gym" });
  await expect(gymSelect).toHaveValue("Movement Mountain View");
  await expect(page.getByText("CLEANED PILOT MAP")).toBeVisible();
  await gymSelect.selectOption("Movement Santa Clara");
  await expect(
    page.getByAltText("Movement Santa Clara cleaned map"),
  ).toBeVisible();
});

test("starts a gym session and persists an attempt with notes", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await upload(page);
  await add(page, 0.4, 0.6);
  await add(page, 0.55, 0.35);
  await page.getByLabel("Color").fill("Green");
  await page.getByLabel("Grade", { exact: true }).fill("V2");
  await page.getByLabel("Gym optional").fill("Test Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();

  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Test Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await expect(
    page.getByRole("heading", { name: "Session", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".active-session-bar")).toContainText(/00:00:0/);
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Green V2/ })
    .click();
  await page.locator(".mapping-panel").getByTestId("hold-1").click();
  await page.getByRole("button", { name: /Add attempt/ }).click();
  await expect(page.getByText("#1 · Attempted")).toBeVisible();
  await expect(
    page.locator(".attempt-history").getByText("Controlled hold 1"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Find your next line" }),
  ).toBeVisible();
  await expect(
    page.locator(".session-lines-workspace").getByRole("button", {
      name: /Green V2 1 attempt/,
    }),
  ).toBeVisible();
  await page
    .locator(".session-lines-workspace")
    .getByRole("button", { name: /Green V2/ })
    .click();
  await page
    .getByLabel("Notes optional")
    .fill("Kept my hips close on the last move.");
  await page
    .locator(".route-action-dock")
    .getByRole("button", { name: "Send", exact: true })
    .click();

  await expect(page.getByText("#2 · Sent")).toBeVisible();
  await expect(page.locator(".pill")).toHaveText("Completed");
  await expect(
    page.locator(".attempt-history").getByText("Controlled hold 2"),
  ).toBeVisible();
  await expect(
    page.getByText("Kept my hips close on the last move."),
  ).toBeVisible();
  await page.reload();
  await showLines(page);
  await page.getByRole("button", { name: /Completed 1/ }).click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Green V2/ })
    .click();
  await expect(page.getByText("#2 · Sent")).toBeVisible();
  await page
    .locator(".attempt-history article")
    .filter({ hasText: "#2 · Sent" })
    .getByRole("button", { name: "Edit attempt" })
    .click();
  await page.getByLabel("Edit attempt result").selectOption("attempt");
  await page.getByRole("button", { name: "Save attempt" }).click();
  await expect(page.getByText("#2 · Attempted")).toBeVisible();
  await expect(page.locator(".pill")).toHaveText("Ongoing");
  await page
    .locator(".attempt-history article")
    .filter({ hasText: "#2 · Attempted" })
    .getByRole("button", { name: "Edit attempt" })
    .click();
  await page.getByLabel("Edit attempt result").selectOption("sent");
  await page.getByRole("button", { name: "Save attempt" }).click();
  await expect(page.locator(".pill")).toHaveText("Completed");
});

test("organizes session lines into tried, recent, and available groups", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await upload(page);
  await add(page, 0.4, 0.6);
  await page.getByLabel("Color").fill("Green");
  await page.getByLabel("Grade", { exact: true }).fill("V2");
  await page.getByLabel("Gym optional").fill("Session Lines Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Create another line from this photo/ })
    .click();
  await page.getByRole("button", { name: /Reps only/ }).click();
  await page.getByLabel("Color").fill("Blue");
  await page.getByLabel("Grade", { exact: true }).fill("V1");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();

  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Session Lines Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Green V2/ })
    .first()
    .click();
  await page.getByRole("button", { name: /^Add attempt/ }).click();
  await page
    .getByRole("button", { name: /Back to lines|Back to session/ })
    .click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Session" })
    .click();
  await page.getByRole("button", { name: "End session" }).click();

  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Session Lines Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Session" }),
  ).toHaveAttribute("aria-current", "page");
  const groups = page.locator(".session-line-group");
  const tried = groups.filter({ hasText: "Tried this session" });
  const recent = groups.filter({ hasText: "Recent from earlier sessions" });
  const available = groups.filter({ hasText: "Not tried yet" });
  await expect(tried).toContainText("No attempts logged yet");
  await expect(recent).toContainText("Green V2");
  await expect(available).toContainText("Blue V1");
  await page.setViewportSize({ width: 320, height: 700 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  const sessionWorkspace = page.getByRole("navigation", {
    name: "Main navigation",
  });
  await expect(sessionWorkspace).toBeVisible();
  await expect(sessionWorkspace).toHaveCSS("position", "fixed");
  await expect(
    sessionWorkspace.getByRole("button", { name: "Session" }),
  ).toHaveAttribute("aria-current", "page");
  await sessionWorkspace.getByRole("button", { name: "Lines" }).click();
  await available.getByRole("button", { name: /Blue V1/ }).click();
  await expect(
    page.getByRole("button", { name: /Back to lines|Back to session/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Add attempt/ }).click();
  await page
    .getByRole("button", { name: /Back to lines|Back to session/ })
    .click();
  await expect(
    sessionWorkspace.getByRole("button", { name: "Lines" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#session-lines")).toBeInViewport();
  await expect(tried).toContainText("Blue V1");
  await expect(recent).toContainText("Green V2");
  await expect(available).not.toContainText("Blue V1");
  await sessionWorkspace.getByRole("button", { name: "Map" }).click();
  await expect(page.locator(".gym-map-page")).toBeVisible();
  await sessionWorkspace.getByRole("button", { name: "Session" }).click();
  await expect(page.locator("#session-summary")).toBeInViewport();
  await sessionWorkspace.getByRole("button", { name: "Session" }).click();
  await expect(page.locator("#session-current")).toBeVisible();
});

test("backfills a past session and adds attempts at the historical time", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.4, 0.6);
  await page.getByLabel("Color").fill("Blue");
  await page.getByLabel("Grade", { exact: true }).fill("V3");
  await page.getByLabel("Gym optional").fill("Archive Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();

  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByRole("button", { name: "Add past session" }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Archive Gym");
  await page.getByLabel("Started").fill("2026-08-15T18:00");
  await page.getByLabel("Ended").fill("2026-08-15T20:30");
  await page.getByRole("button", { name: /Create past session/ }).click();

  await expect(
    page.getByRole("heading", { name: "Past session", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Session elapsed time")).toContainText("2h 30m");
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Blue V3/ })
    .click();
  await page.locator(".mapping-panel").getByTestId("hold-1").click();
  await page.getByRole("button", { name: /Add attempt/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await showSession(page);
  await page.getByRole("button", { name: "Finish adding history" }).click();

  await expect(page.getByText(/Aug 15, 2026/)).toBeVisible();
  await expect(page.locator(".session-summary")).toContainText("1 attempt");
  await page.getByRole("button", { name: "Edit session" }).click();
  await page.getByLabel("Edit session gym").fill("Revised Archive Gym");
  await page.getByLabel("Edit session start").fill("2026-08-15T17:45");
  await page.getByLabel("Edit session end").fill("2026-08-15T19:00");
  await page.getByRole("button", { name: "Save session details" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "include every attempt",
  );
  await page.getByLabel("Edit session end").fill("2026-08-15T20:45");
  await page.getByRole("button", { name: "Save session details" }).click();
  await expect(
    page.getByRole("heading", { name: "Revised Archive Gym" }),
  ).toBeVisible();

  await page
    .locator(".session-lines")
    .getByRole("button", { name: /Blue V3/ })
    .click();
  await page.getByRole("button", { name: "Edit attempt" }).click();
  await page.getByLabel("Edit attempt result").selectOption("sent");
  await page.getByLabel("Edit attempt time").fill("2026-08-16T19:15");
  await page.getByRole("button", { name: "Save attempt" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "inside its session",
  );
  await page.getByLabel("Edit attempt time").fill("2026-08-15T19:15");
  await page
    .getByLabel("Edit attempt notes")
    .fill("Corrected after reviewing the past session.");
  await page.getByRole("button", { name: "Save attempt" }).click();
  await expect(page.getByText("#1 · Sent")).toBeVisible();
  await expect(
    page.getByText("Corrected after reviewing the past session."),
  ).toBeVisible();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: "Edit session" }).click();
  await page.getByRole("button", { name: "Edit session activity" }).click();
  await expect(
    page.getByRole("heading", { name: "Past session", exact: true }),
  ).toBeVisible();
  await showLines(page);
  await expect(
    page.getByRole("heading", { name: "Find your next line" }),
  ).toBeVisible();
  await expect(page.getByLabel("Current session summary")).toContainText("1");
  await showSession(page);
  await page.getByRole("button", { name: "Finish adding history" }).click();
  await page.getByRole("button", { name: "Edit session" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete session" }).click();
  await expect(
    page.getByRole("heading", { name: "Revised Archive Gym" }),
  ).toHaveCount(0);
  await showLines(page);
  await expect(page.getByRole("button", { name: /Blue V3/ })).toBeVisible();
});

test("records unestablished starts, partial starts, touched or controlled holds, and attempt batches", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.35, 0.7);
  await add(page, 0.5, 0.5);
  await add(page, 0.65, 0.3);
  await page.getByLabel("Color").fill("Mint");
  await page.getByLabel("Grade", { exact: true }).fill("V4");
  await page.getByLabel("Gym optional").fill("Semantics Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Semantics Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Mint V4/ })
    .click();
  await expect(page.getByTestId("photo-map")).toHaveCount(1);

  await expect(
    page.getByRole("button", { name: /Couldn’t get into the start/ }),
  ).toBeVisible();
  await expect(page.locator(".attempt-hold-picker > strong")).toHaveCount(0);
  await page.getByRole("button", { name: /^Add attempt/ }).click();
  await expect(
    page.locator(".attempt-history").getByText("Couldn’t get into the start"),
  ).toBeVisible();

  await page.getByRole("button", { name: "From a hold" }).click();
  await page
    .getByLabel("Partial starting hold")
    .selectOption({ label: "Hold 2" });
  await page.locator(".mapping-panel").getByTestId("hold-1").click();
  await page.getByRole("button", { name: /^Add attempt/ }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "cannot come before",
  );

  await page.locator(".mapping-panel").getByTestId("hold-3").click();
  await page.getByLabel("Attempts to add").fill("3");
  await page.getByRole("button", { name: "Add 3 attempts" }).click();
  await expect(page.getByText("Total attempts").locator("..")).toContainText(
    "4",
  );
  await expect(
    page.locator(".attempt-history").getByText("Started from hold 2"),
  ).toHaveCount(3);
  await expect(
    page.locator(".attempt-history").getByText("Controlled hold 3"),
  ).toHaveCount(3);

  await page.getByRole("button", { name: "From the ground" }).click();
  await page.locator(".mapping-panel").getByTestId("hold-2").click();
  await page.getByRole("button", { name: /Touched/ }).click();
  await page.getByLabel("Attempts to add").fill("1");
  await page.getByRole("button", { name: /^Add attempt/ }).click();
  await expect(
    page.locator(".attempt-history").getByText("Touched hold 2"),
  ).toBeVisible();
});

test("reuses one photo for a reps-only warm-up line", async ({ page }) => {
  await upload(page);
  await add(page, 0.5, 0.5);
  await page.getByLabel("Color").fill("Red");
  await page.getByLabel("Grade", { exact: true }).fill("V1");
  await page.getByLabel("Gym optional").fill("Test Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();

  await page
    .getByRole("button", { name: /Create another line from this photo/ })
    .click();
  await page.getByRole("button", { name: /Reps only/ }).click();
  await expect(
    page.getByText("Reps-only line — no markers needed."),
  ).toBeVisible();
  await page.getByLabel("Color").fill("Yellow");
  await page.getByLabel("Grade", { exact: true }).fill("V0");
  await page.getByRole("button", { name: /Warm-up/ }).click();
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await expect(page.getByText("Repetitions")).toBeVisible();

  const stored = await page.evaluate(async () => {
    const request = indexedDB.open("bouldero-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<Array<Record<string, unknown>>>(
      (resolve, reject) => {
        const get = db
          .transaction("projects", "readonly")
          .objectStore("projects")
          .getAll();
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      },
    );
    db.close();
    return rows.map((row) => ({
      name: row.name,
      hasPhoto: row.photo instanceof Blob,
      source: row.source_project_id,
      mode: row.route_mode,
    }));
  });
  expect(stored.find((row) => row.name === "Red V1")?.hasPhoto).toBe(true);
  expect(stored.find((row) => row.name === "Yellow V0")).toMatchObject({
    hasPhoto: false,
    mode: "count_only",
  });
  expect(stored.find((row) => row.name === "Yellow V0")?.source).toBeTruthy();

  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await expect(page.getByText("Shared wall · 2 lines")).toHaveCount(2);
  await expect(page.locator(".arrow-icon").first()).toBeVisible();
  await page.evaluate(async () => {
    const request = indexedDB.open("bouldero-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("projects", "readwrite");
      const store = transaction.objectStore("projects");
      const get = store.getAll();
      get.onsuccess = () => {
        const warmUp = get.result.find(
          (row: { name: string }) => row.name === "Yellow V0",
        );
        store.put({
          ...warmUp,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Yellow V0/ })
    .click();
  await expect(page.locator(".pill")).toHaveText("Completed");
  expect(
    await page.evaluate(async () => {
      const request = indexedDB.open("bouldero-v1");
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const rows = await new Promise<Array<{ name: string; status: string }>>(
        (resolve, reject) => {
          const get = db
            .transaction("projects", "readonly")
            .objectStore("projects")
            .getAll();
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        },
      );
      db.close();
      return rows.find((row) => row.name === "Yellow V0")?.status;
    }),
  ).toBe("sent");
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Test Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Yellow V0/ })
    .click();
  await page.getByRole("button", { name: /Add attempt/ }).click();
  await page.getByRole("button", { name: /Add attempt/ }).click();
  await expect(page.getByText("Total attempts").locator("..")).toContainText(
    "2",
  );
});

test("filters, lists, completes, archives, and restores lines", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.45, 0.55);
  await page.getByLabel("Color").fill("Blue");
  await page.getByLabel("Grade", { exact: true }).fill("V5");
  await page.getByLabel("Gym optional").fill("Library Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();

  await page.getByRole("button", { name: "Mark completed" }).click();
  await expect(page.locator(".pill")).toHaveText("Completed");
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await showLines(page);
  await expect(page.getByRole("button", { name: /Blue V5/ })).toBeVisible();
  await page.getByRole("button", { name: /Ongoing 0/ }).click();
  await expect(page.getByRole("button", { name: /Blue V5/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Completed 1/ }).click();
  await showLines(page);
  await expect(page.getByRole("button", { name: /Blue V5/ })).toBeVisible();

  await page.getByRole("button", { name: "List view" }).click();
  await expect(page.locator(".project-grid")).toHaveClass(/list-view/);
  await showLines(page);
  await page.getByLabel("Filter by gym").selectOption("Library Gym");
  await page.getByLabel("Search lines").fill("missing");
  await expect(
    page.getByRole("heading", { name: "No lines match." }),
  ).toBeVisible();
  await page.getByLabel("Search lines").fill("blue");
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Blue V5/ })
    .click();

  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.locator(".pill")).toHaveText("Archived");
  await page.getByRole("button", { name: "Move to ongoing" }).click();
  await expect(page.locator(".pill")).toHaveText("Ongoing");
});

test("shows live session counts, switches lines directly, and offers a next step after send", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.5, 0.5);
  await page.getByLabel("Color").fill("Olive");
  await page.getByLabel("Grade", { exact: true }).fill("V2");
  await page.getByLabel("Gym optional").fill("Flow Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Create another line from this photo/ })
    .click();
  await page.getByRole("button", { name: /Reps only/ }).click();
  await page.getByLabel("Color").fill("Gold");
  await page.getByLabel("Grade", { exact: true }).fill("V1");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Create another line from this photo/ })
    .click();
  await page.getByRole("button", { name: /Reps only/ }).click();
  await page.getByLabel("Color").fill("Away");
  await page.getByLabel("Grade", { exact: true }).fill("V0");
  await page.getByLabel("Gym optional").fill("Other Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();

  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Flow Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  const sessionWorkspace = page.getByRole("navigation", {
    name: "Main navigation",
  });
  await expect(sessionWorkspace).toBeVisible();
  await expect(
    sessionWorkspace.getByRole("button", { name: "Session" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Choose where to begin" }),
  ).toBeVisible();
  await sessionWorkspace.getByRole("button", { name: "Session" }).click();
  await expect(
    sessionWorkspace.getByRole("button", { name: "Session" }),
  ).toHaveAttribute("aria-current", "page");
  const summary = page.getByLabel("Current session summary");
  await expect(summary.getByText("Attempts").locator("..")).toContainText("0");
  await expect(summary.getByText("New lines").locator("..")).toContainText("0");
  await expect(summary.getByText("Carried in").locator("..")).toContainText(
    "2",
  );

  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Away V0/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "This session is at Flow Gym." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Send project/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Edit line & holds" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();

  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Olive V2/ })
    .click();
  await page.locator(".line-switcher summary").click();
  await page
    .locator(".line-switcher")
    .getByRole("button", { name: /Gold V1/ })
    .click();
  await expect(page.getByRole("heading", { name: "Gold V1" })).toBeVisible();
  await page.getByRole("button", { name: /^Add attempt/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await showSession(page);
  await expect(
    page
      .locator("#session-current")
      .getByRole("heading", { name: "Gold V1", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#session-current")).toContainText(
    "1 logged this session",
  );
  await sessionWorkspace.getByRole("button", { name: "Lines" }).click();
  await expect(
    sessionWorkspace.getByRole("button", { name: "Lines" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(summary.getByText("Attempts").locator("..")).toContainText("1");
  const goldCard = page
    .locator(".project-grid .project-card")
    .filter({ hasText: "Gold V1" });
  await expect(goldCard.locator(".card-attempts")).toContainText("1 total");
  await expect(goldCard.locator(".card-attempts")).toContainText("1 today");
  await expect(goldCard.locator(".card-attempts")).toContainText("Just now");
  await expect(
    page.locator(".project-grid .project-card").first(),
  ).toContainText("Gold V1");

  await page.getByRole("button", { name: /New line/ }).click();
  await page
    .locator(".saved-photo-strip")
    .getByRole("button", { name: /Olive V2/ })
    .click();
  await page.getByRole("button", { name: /Reps only/ }).click();
  await page.getByLabel("Color").fill("Coral");
  await page.getByLabel("Grade", { exact: true }).fill("V0");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await showSession(page);
  await expect(summary.getByText("New lines").locator("..")).toContainText("1");

  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Gold V1/ })
    .click();
  await page
    .locator(".route-action-dock")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await expect(page.getByText("Completed this session")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Next ongoing line/ }),
  ).toBeVisible();
});

test("shows session history, timeline notes, and line progress", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.4, 0.6);
  await page.getByLabel("Color").fill("Black");
  await page.getByLabel("Grade", { exact: true }).fill("V6");
  await page.getByLabel("Gym optional").fill("History Gym");
  await page.getByRole("button", { name: /Top out/ }).click();
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("History Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Black V6/ })
    .click();
  await page
    .getByLabel("Notes optional")
    .fill("Matched the final hold with control.");
  await page
    .locator(".route-action-dock")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await page.locator(".back-button").click();
  await page.getByRole("button", { name: "End session" }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Session timeline" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "History Gym" }),
  ).toBeVisible();
  await expect(page.locator(".session-summary")).toContainText("1 attempt");
  await expect(page.locator(".session-summary")).toContainText("1 send");
  await page.getByRole("button", { name: /View session story/ }).click();
  const report = page.getByLabel("History Gym session report");
  await expect(
    report.getByRole("heading", { name: "Difficulty distribution" }),
  ).toBeVisible();
  await expect(
    report.getByRole("heading", { name: "Whole-session timeline" }),
  ).toBeVisible();
  await report.getByRole("button", { name: "Inspect V6: 1 records" }).click();
  await expect(report.locator(".overview-insight")).toContainText("1 sends");
  await report
    .getByRole("button", { name: "Review Black V6, 1 attempts" })
    .click();
  await expect(report.getByLabel("Line endpoint review")).toContainText("Wall top-out");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => undefined,
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
  });
  await page.getByRole("button", { name: "Create & share image card" }).click();
  await expect(page.getByText("Session image card shared.")).toBeVisible();
  await expect(
    page
      .locator(".session-lines")
      .getByText("“Matched the final hold with control.”"),
  ).toBeVisible();
  await page
    .locator(".session-lines")
    .getByRole("button", { name: /Black V6/ })
    .click();
  await expect(page.getByRole("button", { name: /History/ })).toBeVisible();
  await expect(
    page.locator(".attempt-history").getByText("Reached TOP OUT"),
  ).toBeVisible();
  await expect(page.getByText(/History Gym ·/)).toBeVisible();
  await expect(page.getByText("Sends recorded").locator("..")).toContainText(
    "1",
  );
});

test("edits saved holds and completes warm-ups after a send and keeps them reusable", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.35, 0.65);
  await page.getByLabel("Color").fill("Rose");
  await page.getByLabel("Grade", { exact: true }).fill("V1");
  await page.getByLabel("Gym optional").fill("Repeat Gym");
  await page.getByRole("button", { name: /Warm-up/ }).click();
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await expect(page.getByLabel("Line purpose")).toContainText("Warm-up");

  await page.getByRole("button", { name: "Edit line & holds" }).click();
  await add(page, 0.65, 0.35);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Holds mapped").locator("..")).toContainText("2");

  await page
    .getByRole("button", { name: /Back to session|Back to lines|All lines/ })
    .click();
  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Repeat Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Rose V1/ })
    .click();
  await page
    .locator(".route-action-dock")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await expect(
    page.getByText("Send recorded. Line completed and available to reuse."),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Completed/ }).click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Rose V1/ })
    .click();
  await expect(page.locator(".pill")).toHaveText("Completed");
  await page
    .locator(".route-action-dock")
    .getByRole("button", { name: "Send", exact: true })
    .click();
  await page.getByRole("button", { name: "End session" }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".session-summary")).toContainText("0 sends");
  await page.getByRole("button", { name: /View session story/ }).click();
  await expect(page.locator(".overview-warm-note")).toContainText(
    "2 warm-up sends",
  );
  await expect(page.locator(".overview-stats")).toContainText("0");
  await page.getByRole("button", { name: "Inspect V1: 2 records" }).click();
  await expect(page.locator(".overview-insight")).toContainText(
    "2 sends including warm-ups",
  );
});

test("permanently deletes a line and its attempts", async ({ page }) => {
  await upload(page);
  await add(page, 0.4, 0.6);
  await page.getByLabel("Color").fill("Delete me");
  await page.getByLabel("Grade", { exact: true }).fill("V0");
  await page.getByLabel("Gym optional").fill("Delete Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete line" }).click();

  await expect(
    page.getByText("Delete me V0 was permanently deleted."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete me V0/ })).toHaveCount(
    0,
  );
});

test("gym filter matches legacy capitalization and whitespace", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const request = indexedDB.open("bouldero-v1", 3);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const database = request.result;
        for (const name of ["projects", "sessions", "attempts", "gym_maps"])
          if (!database.objectStoreNames.contains(name))
            database.createObjectStore(name, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("projects", "readwrite");
      transaction.objectStore("projects").put({
        id: crypto.randomUUID(),
        name: "Blue V2",
        grade: "V2",
        gym: "  santa clara  ",
        photo_url: "",
        photo: new Blob(["photo"], { type: "image/jpeg" }),
        status: "active",
        created_at: new Date().toISOString(),
        sent_at: null,
        holds: [],
        route_mode: "count_only",
        source_project_id: null,
        finish_type: "hold",
        notes: "",
        purpose: "project",
      });
      transaction.objectStore("projects").put({
        id: crypto.randomUUID(),
        name: "Red V4",
        grade: "V4",
        gym: "Other Gym",
        photo_url: "",
        photo: new Blob(["photo"], { type: "image/jpeg" }),
        status: "sent",
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        holds: [],
        route_mode: "count_only",
        source_project_id: null,
        finish_type: "hold",
        notes: "",
        purpose: "project",
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await showLines(page);

  await showLines(page);
  await page.getByLabel("Filter by gym").selectOption({ label: "santa clara" });
  await expect(page.getByRole("button", { name: /Blue V2/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Line library 01/i }),
  ).toBeVisible();
  await expect(page.getByPlaceholder(/Search in santa clara/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "All 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "All 1" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /Red V4/ })).toHaveCount(0);
});

test("quick logs without photos, keeps duplicate lines distinct, and restores backup", async ({
  page,
}) => {
  await page.goto("/");
  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Visitor Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await page.getByRole("button", { name: "Quick log", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Quick log" });
  await sheet.getByRole("button", { name: "Blue", exact: true }).click();
  await sheet.getByRole("button", { name: "V3", exact: true }).click();
  await sheet.getByLabel("Notes · optional").fill("Left wall");
  await sheet.getByRole("button", { name: "Add attempt", exact: true }).click();
  await expect(sheet.getByRole("status")).toContainText("saved");
  await sheet.getByRole("button", { name: "Blue", exact: true }).click();
  await expect(
    sheet.getByText("Same color and grade already saved"),
  ).toBeVisible();
  await sheet.getByRole("button", { name: "Send", exact: true }).click();
  await sheet.getByRole("button", { name: "Close quick log" }).click();
  await expect(page.locator(".project-grid .project-card")).toHaveCount(2);
  await page.reload();
  await showLines(page);
  await expect(page.locator(".project-grid .project-card")).toHaveCount(2);
  await expect(page.locator(".session-live-stats")).toContainText("2");
  await showDataTools(page);
  const downloadPromise = page.waitForEvent("download");
  await showDataTools(page);
  await page.getByRole("button", { name: "Export backup" }).click();
  const path = await (await downloadPromise).path();
  await page.getByRole("button", { name: "End session", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await showDataTools(page);
  await page.getByRole("button", { name: "Import backup" }).click();
  await (await chooserPromise).setFiles(path!);
  await expect(page.getByRole("status")).toContainText(/Imported|imported/);
  await expect(page.locator(".project-grid .project-card")).toHaveCount(2);
});

test("photo-less lines can add a photo later and gym grades persist", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /New line/ }).click();
  await page.getByLabel("Gym for photo reuse").fill("Font Gym");
  await page.getByRole("button", { name: "Continue without a photo" }).click();
  await page.getByRole("button", { name: "Green", exact: true }).click();
  await page.getByLabel("Gym grading system").selectOption("Font");
  await page.getByRole("button", { name: "6A", exact: true }).click();
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await expect(
    page.getByRole("heading", { name: "Green 6A", exact: true }),
  ).toBeVisible();
  await page.reload();
  await showLines(page);
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Lines", exact: true })
    .click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Green 6A/ })
    .click();
  await page.getByRole("button", { name: "Edit line & holds" }).click();
  await expect(page.getByLabel("Gym grading system")).toHaveValue("Font");
  await expect(page.getByLabel("Grade", { exact: true })).toHaveValue("6A");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".project-details")).toBeVisible();
  await page.reload();
  await showLines(page);
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Lines", exact: true })
    .click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Green 6A/ })
    .click();
  await page.getByRole("button", { name: "Edit line & holds" }).click();
  await page
    .getByLabel("Choose a different photo", { exact: true })
    .setInputFiles({
      name: "later.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByRole("button", { name: /Reps only/ }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".project-details")).toBeVisible();
  await page.reload();
  await showLines(page);
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Lines", exact: true })
    .click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Green 6A/ })
    .click();
  await expect(page.getByTestId("photo-map").locator("img")).toHaveAttribute(
    "src",
    /^blob:/,
  );
});

test("fixed attempt action is reachable after hold selection and switcher starts collapsed", async ({
  page,
}) => {
  await upload(page);
  await add(page, 0.4, 0.5);
  await page.getByLabel("Color").fill("Blue");
  await page.getByLabel("Grade", { exact: true }).fill("V3");
  await page.getByLabel("Gym optional").fill("Reach Gym");
  await page.getByRole("button", { name: /Done · Save line/ }).click();
  await page.locator(".back-button").click();
  await showSession(page);
  await page.getByRole("button", { name: /Start a session/ }).click();
  await page.getByLabel("Gym", { exact: true }).fill("Reach Gym");
  await page.getByRole("button", { name: /Start session/ }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: "Lines", exact: true })
    .click();
  await showLines(page);
  await page
    .locator(".project-grid")
    .getByRole("button", { name: /Blue V3/ })
    .click();
  await page.getByRole("button", { name: "Hold 1, TOP", exact: true }).click();
  const action = page.locator(".route-action-dock");
  await expect(action).toContainText("Hold 1");
  const box = await action.boundingBox();
  expect(box!.y).toBeGreaterThan(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(845);
  await action
    .getByRole("button", { name: "Add attempt", exact: true })
    .click();
  await expect(page.getByLabel("Line attempt totals")).toContainText(
    "1 attempts total",
  );
  await expect(page.getByLabel("Line attempt totals")).toContainText(
    "1 this session",
  );
  await page.screenshot({ path: "docs/previews/0.3.9-beta2-recording.png" });
});
