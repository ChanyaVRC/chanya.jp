import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const publicPages = [
  { path: "/", heading: "ねこ。多分技術者。" },
  { path: "/about/", heading: "九島茶にゃ。" },
  { path: "/gallery/", heading: "Nankotsu." },
  { path: "/development/", heading: "作ったもの。" },
  { path: "/contact/", heading: "話す場所。" },
  { path: "/other/", heading: "外にあるもの。" },
  {
    path: "/products/contents/RuntimeHtml/",
    heading: "書く。実行する。外へ出さない。",
  },
] as const;

async function assertNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const details = results.violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => `  ${node.target.join(" ")}: ${node.failureSummary}`)
          .join("\n")}`,
    )
    .join("\n\n");

  expect(results.violations, details).toEqual([]);
}

test.describe("public pages", () => {
  for (const { path, heading } of publicPages) {
    test(`${path} is keyboard-readable and axe-clean`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.locator("main")).toHaveAttribute("id", "main-content");
      await assertNoAxeViolations(page);
    });
  }

  test("404 is axe-clean and offers a route home", async ({ page }) => {
    const response = await page.goto("/not-a-real-route/");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "ここには何もありません。",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Homeへ戻る" })).toHaveAttribute(
      "href",
      "/",
    );
    await assertNoAxeViolations(page);
  });
});

test("Cmd/Ctrl-K opens, filters and closes the command palette", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Control+K");

  const dialog = page.locator("[data-command-dialog]");
  const input = page.locator("[data-command-input]");
  await expect(dialog).toBeVisible();
  await expect(input).toBeFocused();

  await input.fill("RuntimeHtml");
  const visibleOptions = page.locator("[data-command-item]:visible");
  await expect(visibleOptions).toHaveCount(1);
  await expect(visibleOptions).toContainText("RuntimeHtml");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("gallery exposes 42 works in a closable dialog", async ({ page }) => {
  await page.goto("/gallery/");

  const openButtons = page.locator("[data-gallery-open]");
  await expect(openButtons).toHaveCount(42);
  await openButtons.first().click();

  const dialog = page.locator("[data-lightbox]");
  await expect(dialog).toBeVisible();
  await expect(page.locator("[data-lightbox-title]")).toHaveText("Nankotsu 01");
  await expect(page.locator("[data-lightbox-image]")).toHaveAttribute(
    "alt",
    /Nankotsu/,
  );

  await page.locator("[data-lightbox-close]").click();
  await expect(dialog).not.toBeVisible();

  const finalImage = openButtons.last().locator("img");
  await finalImage.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      finalImage.evaluate(
        (image) =>
          image instanceof HTMLImageElement &&
          image.complete &&
          image.naturalWidth > 0,
      ),
    )
    .toBe(true);
});

test("RuntimeHtml runs locally inside its restricted sandbox", async ({
  page,
}) => {
  await page.goto("/products/contents/RuntimeHtml/");

  const iframe = page.locator("[data-runtime-frame]");
  await expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
  await expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");

  const srcdoc = await iframe.getAttribute("srcdoc");
  expect(srcdoc).toContain("connect-src 'none'");
  expect(srcdoc).toContain("form-action 'none'");
  expect(srcdoc).not.toContain("'unsafe-eval'");

  const preview = page.frameLocator("[data-runtime-frame]");
  await preview.getByRole("button", { name: "Run JavaScript" }).click();
  await expect(preview.locator("#result")).toHaveText(
    "JavaScript is running inside the sandbox.",
  );

  await page.locator("[data-runtime-source]").fill(`<p id="isolation">pending</p>
<script>
  (async () => {
    const result = { parent: false, fetch: false, eval: false };
    try { result.parent = Boolean(window.parent.document.body); } catch {}
    try {
      await fetch("https://example.com/", { mode: "no-cors" });
      result.fetch = true;
    } catch {}
    try { result.eval = window.eval("1 + 1") === 2; } catch {}
    document.querySelector("#isolation").textContent = JSON.stringify(result);
  })();
</script>`);
  await page.locator("[data-runtime-run]").click();
  await expect(preview.locator("#isolation")).toHaveText(
    '{"parent":false,"fetch":false,"eval":false}',
  );
});

test("all public pages fit required viewports without horizontal scrolling", async ({
  page,
}) => {
  const viewports = [
    { width: 320, height: 720 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const { path } of publicPages) {
      await page.goto(path);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));

      expect(
        dimensions.content,
        `${path} overflows at ${String(viewport.width)}px`,
      ).toBeLessThanOrEqual(dimensions.viewport);
    }
  }
});
