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

test("only the home page uses an oversized page heading", async ({ page }) => {
  await page.goto("/");
  const homeSize = await page
    .getByRole("heading", { level: 1 })
    .evaluate((heading) => Number.parseFloat(getComputedStyle(heading).fontSize));

  expect(homeSize).toBeGreaterThan(80);

  for (const { path } of publicPages.slice(1)) {
    await page.goto(path);
    const pageSize = await page
      .getByRole("heading", { level: 1 })
      .evaluate((heading) =>
        Number.parseFloat(getComputedStyle(heading).fontSize),
      );

    expect(pageSize, `${path} heading is oversized`).toBeLessThanOrEqual(52);
  }

  await page.goto("/not-a-real-route/");
  const notFoundSize = await page
    .getByRole("heading", { level: 1 })
    .evaluate((heading) => Number.parseFloat(getComputedStyle(heading).fontSize));

  expect(notFoundSize, "404 heading is oversized").toBeLessThanOrEqual(52);
});

test("profile code is complete, highlighted and visible in the first viewport", async ({
  page,
}) => {
  const viewports = [
    { width: 320, height: 720 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ] as const;
  const expectedCode = `type Chanya = {
  name: "九島茶にゃ";
  role: "多分技術者";
  location: "Japan";
};`;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const codeFigure = page.locator("[data-profile-code]");
    await expect(codeFigure).toBeVisible();
    const result = await codeFigure.evaluate((figure) => {
      const pre = figure.querySelector("pre");
      if (!(pre instanceof HTMLElement)) {
        throw new Error("profile code pre is missing");
      }

      const bounds = figure.getBoundingClientRect();
      const syntaxKinds = [
        ...figure.querySelectorAll<HTMLElement>("[data-syntax]"),
      ].map((token) => token.dataset.syntax);

      return {
        top: bounds.top,
        bottom: bounds.bottom,
        viewportHeight: window.innerHeight,
        clientWidth: pre.clientWidth,
        scrollWidth: pre.scrollWidth,
        text: pre.textContent?.replace(/\r\n/g, "\n").trim() ?? "",
        syntaxKinds: [...new Set(syntaxKinds)].sort(),
      };
    });

    expect(
      result.top,
      `profile code starts above the viewport at ${String(viewport.width)}px`,
    ).toBeGreaterThanOrEqual(-1);
    expect(
      result.bottom,
      `profile code falls below the first viewport at ${String(viewport.width)}px`,
    ).toBeLessThanOrEqual(result.viewportHeight + 1);
    expect(
      result.scrollWidth,
      `profile code scrolls horizontally at ${String(viewport.width)}px`,
    ).toBeLessThanOrEqual(result.clientWidth + 1);
    expect(result.text).toBe(expectedCode);
    expect(result.text.match(/多分技術者/g)).toHaveLength(1);
    expect(result.syntaxKinds).toEqual([
      "keyword",
      "property",
      "string",
      "type",
    ]);
  }
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

test("visible main content stays inside required viewport bounds", async ({
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
      const outOfBounds = await page.locator("main").evaluate((main) => {
        const viewportWidth = document.documentElement.clientWidth;
        const candidates = main.querySelectorAll<HTMLElement>(
          "section, aside, a, button, img, textarea, iframe",
        );

        return [...candidates].flatMap((element) => {
          const styles = getComputedStyle(element);
          if (
            element.closest("[hidden], pre, dialog:not([open])") ||
            styles.display === "none" ||
            styles.visibility === "hidden"
          ) {
            return [];
          }

          const bounds = element.getBoundingClientRect();
          if (
            bounds.width === 0 ||
            bounds.height === 0 ||
            (bounds.left >= -1 && bounds.right <= viewportWidth + 1)
          ) {
            return [];
          }

          return [
            {
              element: element.tagName.toLowerCase(),
              label:
                element.getAttribute("aria-label") ??
                element.textContent?.trim().replace(/\s+/g, " ").slice(0, 60) ??
                "",
              left: Math.round(bounds.left * 10) / 10,
              right: Math.round(bounds.right * 10) / 10,
              viewportWidth,
            },
          ];
        });
      });

      expect(
        outOfBounds,
        `${path} has clipped main content at ${String(viewport.width)}px:\n${JSON.stringify(outOfBounds, null, 2)}`,
      ).toEqual([]);
    }
  }
});

test("non-home primary content reaches the first desktop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  for (const { path } of publicPages.slice(1)) {
    await page.goto(path);

    const pageLayout = page.locator("[data-page-layout]");
    const primaryContent = page.locator("[data-primary-content]");
    await expect(pageLayout, `${path} should have one page layout`).toHaveCount(
      1,
    );
    await expect(
      primaryContent,
      `${path} should have one primary content region`,
    ).toHaveCount(1);
    await expect(primaryContent).toBeVisible();

    const top = await primaryContent.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    expect(top, `${path} primary content starts below the fold`).toBeLessThan(
      800,
    );
  }
});

test("mobile tool and contact compositions remain ordered and in bounds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/products/contents/RuntimeHtml/");

  const paneBounds = await page.evaluate(() => {
    const editor = document
      .querySelector("[data-runtime-source]")
      ?.closest("[data-primary-content] > *");
    const preview = document
      .querySelector("[data-runtime-frame]")
      ?.closest("[data-primary-content] > *");

    if (!(editor instanceof HTMLElement) || !(preview instanceof HTMLElement)) {
      return null;
    }

    const editorBounds = editor.getBoundingClientRect();
    const previewBounds = preview.getBoundingClientRect();
    return {
      editor: {
        top: editorBounds.top,
        bottom: editorBounds.bottom,
      },
      preview: {
        top: previewBounds.top,
        bottom: previewBounds.bottom,
      },
    };
  });

  expect(
    paneBounds,
    "RuntimeHtml editor and preview panes are missing",
  ).not.toBeNull();
  if (!paneBounds) {
    throw new Error("RuntimeHtml editor and preview panes are missing");
  }

  expect(
    paneBounds.preview.top,
    "RuntimeHtml preview should follow the editor on mobile",
  ).toBeGreaterThanOrEqual(paneBounds.editor.bottom - 1);

  await page.goto("/contact/");
  const emailRows = page.locator(
    "[data-primary-content] a[href^='mailto:']",
  );
  await expect(emailRows).toHaveCount(2);

  const emailBounds = await emailRows.evaluateAll((rows) => {
    const viewportWidth = document.documentElement.clientWidth;
    return rows.map((row) => {
      const descendants = [row, ...row.children];
      const bounds = descendants.map((element) =>
        element.getBoundingClientRect(),
      );

      return {
        label: row.getAttribute("href"),
        left: Math.min(...bounds.map((rect) => rect.left)),
        right: Math.max(...bounds.map((rect) => rect.right)),
        viewportWidth,
      };
    });
  });

  for (const bounds of emailBounds) {
    expect(
      bounds.left,
      `${bounds.label} extends past the left edge`,
    ).toBeGreaterThanOrEqual(-1);
    expect(
      bounds.right,
      `${bounds.label} extends past the right edge`,
    ).toBeLessThanOrEqual(bounds.viewportWidth + 1);
  }
});
