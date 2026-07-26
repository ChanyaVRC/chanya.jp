import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type JSHandle,
  type Locator,
  type Page,
} from "@playwright/test";

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

const productionPreviewUrl = "http://127.0.0.1:5174";

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

type DropPosition = "before" | "after";

interface DragSession {
  readonly source: Locator;
  readonly dataTransfer: JSHandle<DataTransfer>;
}

interface DragPoint {
  readonly clientX: number;
  readonly clientY: number;
}

async function dragEventPoint(
  target: Locator,
  position: DropPosition,
): Promise<DragPoint> {
  const bounds = await target.boundingBox();
  if (!bounds) {
    throw new Error("Drag target has no visible bounds.");
  }

  return {
    clientX: bounds.x + bounds.width / 2,
    clientY:
      position === "before"
        ? bounds.y + 1
        : bounds.y + bounds.height - 1,
  };
}

async function beginDrag(
  page: Page,
  source: Locator,
): Promise<DragSession> {
  const bounds = await source.boundingBox();
  if (!bounds) {
    throw new Error("Drag source has no visible bounds.");
  }

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", {
    dataTransfer,
    clientX: bounds.x + bounds.width / 2,
    clientY: bounds.y + bounds.height / 2,
  });
  return { source, dataTransfer };
}

async function dragOver(
  session: DragSession,
  target: Locator,
  position: DropPosition = "before",
): Promise<void> {
  await dragOverAt(
    session,
    target,
    await dragEventPoint(target, position),
  );
}

async function dragOverAt(
  session: DragSession,
  target: Locator,
  point: DragPoint,
): Promise<void> {
  await target.dispatchEvent("dragover", {
    dataTransfer: session.dataTransfer,
    ...point,
  });
}

async function dropAt(
  session: DragSession,
  target: Locator,
  position: DropPosition = "before",
): Promise<void> {
  await target.dispatchEvent("drop", {
    dataTransfer: session.dataTransfer,
    ...(await dragEventPoint(target, position)),
  });
}

async function endDrag(session: DragSession): Promise<void> {
  await session.source.dispatchEvent("dragend", {
    dataTransfer: session.dataTransfer,
  });
  await session.dataTransfer.dispose();
}

test("production preview links and applies shared site styles", async ({
  page,
}) => {
  const stylesheetResponses: { readonly status: number; readonly url: string }[] =
    [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "stylesheet") {
      stylesheetResponses.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });

  const response = await page.goto(`${productionPreviewUrl}/`);
  expect(response?.status()).toBe(200);

  const linkedStylesheets = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLLinkElement).href),
    );
  expect(
    linkedStylesheets.some((url) => /\/assets\/site-[^/]+\.css$/u.test(url)),
  ).toBe(true);
  expect(stylesheetResponses.length).toBeGreaterThanOrEqual(2);
  expect(stylesheetResponses.every(({ status }) => status === 200)).toBe(true);

  const computed = await page.evaluate(() => ({
    bodyMargin: getComputedStyle(document.body).margin,
    headerPosition: getComputedStyle(
      document.querySelector("[data-site-header]")!,
    ).position,
    headingSize: Number.parseFloat(
      getComputedStyle(document.querySelector("h1")!).fontSize,
    ),
  }));
  expect(computed.bodyMargin).toBe("0px");
  expect(computed.headerPosition).toBe("sticky");
  expect(computed.headingSize).toBeGreaterThan(80);
});

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

test("home hero pairs the identity copy with the full profile icon", async ({
  page,
}) => {
  const viewports = [
    { width: 320, height: 720 },
    { width: 375, height: 812 },
    { width: 414, height: 896 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ] as const;
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.locator("[data-profile-code]")).toHaveCount(0);
    await expect(page.getByText("profile.ts", { exact: true })).toHaveCount(0);
    await expect(
      page.locator("[data-profile-photo] figcaption"),
    ).toContainText("九島茶にゃプロフィールアイコン");

    const result = await page.evaluate(() => {
      const copy = document.querySelector<HTMLElement>("[data-home-copy]");
      const photo = document.querySelector<HTMLElement>("[data-profile-photo]");
      if (!(copy && photo)) {
        throw new Error("home hero geometry hooks are missing");
      }

      const picture = photo.querySelector("picture");
      const image = photo.querySelector("img");
      if (!(picture instanceof HTMLElement && image instanceof HTMLImageElement)) {
        throw new Error("profile picture is missing");
      }

      const copyBounds = copy.getBoundingClientRect();
      const photoBounds = photo.getBoundingClientRect();
      const pictureBounds = picture.getBoundingClientRect();
      const imageBounds = image.getBoundingClientRect();
      const imageStyle = getComputedStyle(image);
      const intersectionArea = (first: DOMRect, second: DOMRect) => {
        const width = Math.max(
          0,
          Math.min(first.right, second.right) -
            Math.max(first.left, second.left),
        );
        const height = Math.max(
          0,
          Math.min(first.bottom, second.bottom) -
            Math.max(first.top, second.top),
        );
        return width * height;
      };
      return {
        copy: {
          top: copyBounds.top,
          right: copyBounds.right,
          bottom: copyBounds.bottom,
          left: copyBounds.left,
        },
        photo: {
          top: photoBounds.top,
          right: photoBounds.right,
          bottom: photoBounds.bottom,
          left: photoBounds.left,
        },
        picture: {
          width: pictureBounds.width,
          height: pictureBounds.height,
          objectFit: imageStyle.objectFit,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          loaded: image.complete && image.naturalWidth > 0,
          transform: imageStyle.transform,
          clipPath: imageStyle.clipPath,
          imageTop: imageBounds.top,
          imageRight: imageBounds.right,
          imageBottom: imageBounds.bottom,
          imageLeft: imageBounds.left,
          top: pictureBounds.top,
          right: pictureBounds.right,
          bottom: pictureBounds.bottom,
          left: pictureBounds.left,
        },
        copyPhotoIntersection: intersectionArea(copyBounds, photoBounds),
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(result.copyPhotoIntersection).toBeLessThanOrEqual(1);
    expect(
      result.documentWidth,
      `home page scrolls horizontally at ${String(viewport.width)}px`,
    ).toBeLessThanOrEqual(result.viewportWidth + 1);
    expect(
      Math.abs(result.picture.width - result.picture.height),
      `profile icon is cropped to a non-square frame at ${String(viewport.width)}px`,
    ).toBeLessThanOrEqual(1);
    expect(result.picture.loaded).toBe(true);
    expect(result.picture.objectFit).toBe("contain");
    expect(result.picture.naturalWidth).toBe(result.picture.naturalHeight);
    expect(result.picture.transform).toBe("none");
    expect(result.picture.clipPath).toBe("none");
    expect(Math.abs(result.picture.imageTop - result.picture.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.picture.imageRight - result.picture.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.picture.imageBottom - result.picture.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(result.picture.imageLeft - result.picture.left)).toBeLessThanOrEqual(1);

    for (const [name, bounds] of [
      ["copy", result.copy],
      ["profile", result.photo],
    ] as const) {
      expect(
        bounds.left,
        `${name} starts outside the viewport at ${String(viewport.width)}px`,
      ).toBeGreaterThanOrEqual(-1);
      expect(
        bounds.right,
        `${name} ends outside the viewport at ${String(viewport.width)}px`,
      ).toBeLessThanOrEqual(result.viewportWidth + 1);
    }

    if (viewport.width <= 768) {
      expect(
        result.photo.top - result.copy.bottom,
        `identity copy and icon are cramped at ${String(viewport.width)}px`,
      ).toBeGreaterThanOrEqual(24);
      expect(Math.abs(result.copy.left - result.photo.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.copy.right - result.photo.right)).toBeLessThanOrEqual(1);
    } else {
      expect(
        result.photo.left - result.copy.right,
        `identity copy and icon columns are cramped at ${String(viewport.width)}px`,
      ).toBeGreaterThanOrEqual(12);
      expect(
        result.photo.bottom,
        `profile icon falls below the first viewport at ${String(viewport.width)}px`,
      ).toBeLessThanOrEqual(result.viewportHeight + 1);
      const leftCenter = (result.copy.top + result.copy.bottom) / 2;
      const profileCenter = (result.photo.top + result.photo.bottom) / 2;
      expect(
        Math.abs(leftCenter - profileCenter),
        `hero columns are vertically unbalanced at ${String(viewport.width)}px`,
      ).toBeLessThanOrEqual(32);
    }
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

test("gallery visual order matches DOM order and feature art stays sharp", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/gallery/");

  const featureImage = page
    .locator("[data-gallery-grid] [data-layout='feature'] img")
    .first();
  await expect
    .poll(() =>
      featureImage.evaluate((image) =>
        image instanceof HTMLImageElement ? image.currentSrc : "",
      ),
    )
    .toMatch(/nankotsu-01-1280\.(?:avif|webp)$/u);

  const positions = await page
    .locator("[data-gallery-grid] > [data-gallery-id]")
    .evaluateAll((items) =>
      items.map((item) => {
        const bounds = item.getBoundingClientRect();
        return { top: bounds.top, left: bounds.left };
      }),
    );
  for (let index = 1; index < positions.length; index += 1) {
    const previous = positions[index - 1]!;
    const current = positions[index]!;
    expect(current.top + 1).toBeGreaterThanOrEqual(previous.top);
    if (Math.abs(current.top - previous.top) <= 1) {
      expect(current.left + 1).toBeGreaterThanOrEqual(previous.left);
    }
  }
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

test("Gallery Workbench edits the shared canvas and imports a VRChat image", async ({
  page,
}) => {
  let revision = 1;
  const managedKey = "7cc2ac97-23d5-46fd-8b33-5f45275474dc";
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );

  await page.route("**/admin/gallery/api/assets", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        asset: { key: managedKey, width: 1, height: 1 },
      }),
    });
  });
  await page.route("**/admin/gallery/api/draft", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }
    const request: unknown = route.request().postDataJSON();
    if (
      typeof request !== "object" ||
      request === null ||
      !("sections" in request) ||
      !Array.isArray(request.sections) ||
      !("items" in request) ||
      !Array.isArray(request.items)
    ) {
      await route.fulfill({ status: 400, body: "Invalid test request" });
      return;
    }
    const sections = request.sections;
    const items = request.items;
    revision += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        manifest: {
          schemaVersion: 2,
          version: revision,
          updatedAt: new Date().toISOString(),
          sections,
          items,
        },
      }),
    });
  });
  await page.route("**/media/gallery-managed/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: pixel,
    });
  });

  const response = await page.goto("/admin/gallery/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("link", { name: "ログアウト" }),
  ).toHaveAttribute("href", "/cdn-cgi/access/logout");

  const editorItems = page.locator("[data-gallery-select]");
  await expect(editorItems).toHaveCount(42);
  await editorItems.first().click();

  const inspector = page.locator("[data-gallery-inspector]");
  await expect(inspector).toBeVisible();
  const title = page.getByLabel("タイトル");
  await expect(title).toBeFocused();
  await expect(title).toHaveValue("Nankotsu 01");
  await title.fill("Nankotsu / Arrival");
  await page.locator("[data-gallery-save]").click();
  await expect(editorItems.first().locator("..").locator("figcaption")).toContainText(
    "Nankotsu / Arrival",
  );
  await expect(page.locator("[data-gallery-status]")).toContainText(
    "下書きは同期済み",
  );

  await page.locator("[data-gallery-undo]").click();
  await expect(editorItems.first().locator("..").locator("figcaption")).toContainText(
    "Nankotsu 01",
  );

  const folderInput = page.locator("[data-gallery-folder-input]");
  await folderInput.evaluate((element) => {
    element.removeAttribute("webkitdirectory");
  });
  await folderInput.setInputFiles({
    name: "VRChat_2026-07-25_12-00-00.png",
    mimeType: "image/png",
    buffer: pixel,
  });
  await expect(editorItems).toHaveCount(43);
  await expect(page.locator("[data-gallery-count]")).toHaveText("43");
  await expect(
    page.locator("[data-gallery-grid] figcaption").last(),
  ).toContainText("VRChat 2026-07-25");

  await page.locator("[data-inspector-close]").click();
  await page.setViewportSize({ width: 375, height: 812 });
  await editorItems.last().click();
  await expect(inspector).toBeVisible();
  await expect(title).toBeFocused();
  const inspectorBounds = await inspector.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      width: document.documentElement.clientWidth,
    };
  });
  expect(inspectorBounds.left).toBeGreaterThanOrEqual(-1);
  expect(inspectorBounds.right).toBeLessThanOrEqual(inspectorBounds.width + 1);
  const overlap = await page.evaluate(() => {
    const selected = document.querySelector<HTMLElement>(
      "[data-gallery-select][aria-pressed='true']",
    );
    const sheet = document.querySelector<HTMLElement>(
      "[data-gallery-inspector][data-open='true']",
    );
    if (!selected || !sheet) {
      return Number.POSITIVE_INFINITY;
    }
    const selectedBounds = selected.getBoundingClientRect();
    const sheetBounds = sheet.getBoundingClientRect();
    const width = Math.max(
      0,
      Math.min(selectedBounds.right, sheetBounds.right) -
        Math.max(selectedBounds.left, sheetBounds.left),
    );
    const height = Math.max(
      0,
      Math.min(selectedBounds.bottom, sheetBounds.bottom) -
        Math.max(selectedBounds.top, sheetBounds.top),
    );
    return width * height;
  });
  expect(overlap).toBe(0);
  await assertNoAxeViolations(page);
});

test("Gallery Workbench adds, edits, and reorders sections and photos", async ({
  page,
}) => {
  let revision = 1;
  let draftWrites = 0;
  let savedSectionTitles: string[] = [];
  let savedItems: Array<{
    readonly id: string;
    readonly sectionId: string;
  }> = [];

  await page.route("**/admin/gallery/api/draft", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }

    const request: unknown = route.request().postDataJSON();
    if (
      typeof request !== "object" ||
      request === null ||
      !("sections" in request) ||
      !Array.isArray(request.sections) ||
      !("items" in request) ||
      !Array.isArray(request.items)
    ) {
      await route.fulfill({ status: 400, body: "Invalid test request" });
      return;
    }

    const sections = request.sections;
    const items = request.items;
    draftWrites += 1;
    savedSectionTitles = sections.flatMap((section) =>
      typeof section === "object" &&
      section !== null &&
      "title" in section &&
      typeof section.title === "string"
        ? [section.title]
        : [],
    );
    savedItems = items.flatMap((item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      typeof item.id === "string" &&
      "sectionId" in item &&
      typeof item.sectionId === "string"
        ? [{ id: item.id, sectionId: item.sectionId }]
        : [],
    );
    revision += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        manifest: {
          schemaVersion: 2,
          version: revision,
          updatedAt: new Date().toISOString(),
          sections,
          items,
        },
      }),
    });
  });

  await page.goto("/admin/gallery/");

  const sections = page.locator("[data-gallery-section]");
  await expect(sections).toHaveCount(1);
  await page.locator("[data-section-add]").click();
  await expect(sections).toHaveCount(2);

  const inspector = page.locator("[data-gallery-inspector]");
  await expect(inspector).toBeVisible();
  const sectionTitle = page.getByLabel("セクション名");
  const sectionDescription = page.getByLabel("セクション説明");
  await expect(sectionTitle).toBeFocused();
  await sectionTitle.fill("Night Sessions");
  await sectionDescription.fill("夜のVRChatで撮影した記録。");
  await expect(sections.last().locator("[data-section-title]")).toHaveText(
    "Night Sessions",
  );

  await page.locator("[data-gallery-save]").click();
  await expect(page.locator("[data-gallery-status]")).toContainText(
    "下書きは同期済み",
  );
  await expect.poll(() => savedSectionTitles).toContain("Night Sessions");

  await page.locator("[data-inspector-close]").click();
  const initialSectionId = await sections
    .first()
    .getAttribute("data-section-id");
  const addedSectionId = await sections
    .last()
    .getAttribute("data-section-id");
  if (!initialSectionId || !addedSectionId) {
    throw new Error("Gallery sections have no stable ids.");
  }
  const initialSection = page.locator(
    `[data-gallery-section][data-section-id="${initialSectionId}"]`,
  );
  const addedSection = page.locator(
    `[data-gallery-section][data-section-id="${addedSectionId}"]`,
  );
  const sectionWritesBeforePreview = draftWrites;
  const sectionBoundaryPoint = await dragEventPoint(
    initialSection,
    "before",
  );
  let sectionDrag = await beginDrag(
    page,
    addedSection.locator("[data-section-drag]"),
  );
  await dragOverAt(sectionDrag, initialSection, sectionBoundaryPoint);
  await expect(page.locator("[data-gallery-admin]")).toHaveAttribute(
    "data-drag-label",
    /Night Sessions/u,
  );
  await expect(addedSection).toHaveAttribute("data-dragging", "true");
  await expect(sections.first().locator("[data-section-title]")).toHaveText(
    "Night Sessions",
  );
  await page.waitForTimeout(32);
  await dragOverAt(sectionDrag, initialSection, sectionBoundaryPoint);
  await expect(sections.first()).toHaveAttribute(
    "data-section-id",
    addedSectionId,
  );
  await page.waitForTimeout(800);
  expect(draftWrites).toBe(sectionWritesBeforePreview);
  await endDrag(sectionDrag);
  await expect(sections.first()).toHaveAttribute(
    "data-section-id",
    initialSectionId,
  );
  await expect(page.locator("[data-gallery-admin]")).not.toHaveAttribute(
    "data-drag-active",
    "true",
  );

  sectionDrag = await beginDrag(
    page,
    addedSection.locator("[data-section-drag]"),
  );
  await dragOver(sectionDrag, initialSection);
  await expect(sections.first()).toHaveAttribute(
    "data-section-id",
    addedSectionId,
  );
  await dropAt(sectionDrag, initialSection);
  await endDrag(sectionDrag);
  await expect(sections.first()).toHaveAttribute(
    "data-section-id",
    addedSectionId,
  );
  await page.locator("[data-gallery-save]").click();
  await expect
    .poll(() => savedSectionTitles[0])
    .toBe("Night Sessions");

  await addedSection.locator("[data-section-drag]").focus();
  await page.keyboard.press("Alt+ArrowDown");
  await expect(sections.last()).toHaveAttribute(
    "data-section-id",
    addedSectionId,
  );
  await page.locator("[data-gallery-save]").click();
  await expect(page.locator("[data-gallery-status]")).toContainText(
    "下書きは同期済み",
  );

  const sourceFigure = initialSection
    .locator("[data-gallery-id]")
    .first();
  const sourceId = await sourceFigure.getAttribute("data-gallery-id");
  if (!sourceId) {
    throw new Error("The first gallery item has no stable id.");
  }
  const sourcePhoto = page.locator(
    `[data-gallery-id="${sourceId}"] [data-gallery-select]`,
  );
  const targetGrid = addedSection.locator("[data-section-grid]");
  const photoWritesBeforePreview = draftWrites;
  let photoDrag = await beginDrag(
    page,
    sourcePhoto,
  );
  await dragOver(photoDrag, targetGrid);
  await expect(targetGrid).toHaveAttribute("data-drop-active", "true");
  await expect(
    page.locator(`[data-gallery-id="${sourceId}"]`),
  ).toHaveAttribute("data-dragging", "true");
  await expect(
    addedSection.locator(`[data-gallery-id="${sourceId}"]`),
  ).toHaveCount(1);
  await expect(addedSection.locator("[data-section-count]")).toHaveText(
    "01 works",
  );
  await page.waitForTimeout(800);
  expect(draftWrites).toBe(photoWritesBeforePreview);
  await endDrag(photoDrag);
  await expect(
    initialSection.locator(`[data-gallery-id="${sourceId}"]`),
  ).toHaveCount(1);
  await expect(
    addedSection.locator(`[data-gallery-id="${sourceId}"]`),
  ).toHaveCount(0);
  await expect(targetGrid).not.toHaveAttribute("data-drop-active", "true");

  photoDrag = await beginDrag(page, sourcePhoto);
  await dragOver(photoDrag, targetGrid);
  await expect(
    addedSection.locator(`[data-gallery-id="${sourceId}"]`),
  ).toHaveCount(1);
  await dropAt(photoDrag, targetGrid);
  await endDrag(photoDrag);
  await expect(
    addedSection.locator(`[data-gallery-id="${sourceId}"]`),
  ).toHaveCount(1);
  await page.locator("[data-gallery-save]").click();
  await expect
    .poll(
      () => savedItems.find((item) => item.id === sourceId)?.sectionId,
    )
    .toBe(addedSectionId);

  const movedPhoto = addedSection.locator(
    `[data-gallery-id="${sourceId}"] [data-gallery-select]`,
  );
  await movedPhoto.focus();
  await page.keyboard.press("Alt+ArrowLeft");
  await expect(
    initialSection.locator(`[data-gallery-id="${sourceId}"]`),
  ).toHaveCount(1);

  await page.locator("[data-gallery-save]").click();
  await expect(page.locator("[data-gallery-status]")).toContainText(
    "下書きは同期済み",
  );
  await expect
    .poll(
      () => savedItems.find((item) => item.id === sourceId)?.sectionId,
    )
    .toBe(initialSectionId);
  await assertNoAxeViolations(page);
});

test("Gallery Workbench keeps photo drop boundaries stable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/admin/gallery/");

  const grid = page.locator("[data-section-grid]").first();
  const items = grid.locator("[data-gallery-id]");
  const initialIds = await items.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gallery-id") ?? ""),
  );
  const sourceId = initialIds[3];
  const targetId = initialIds[5];
  if (!sourceId || !targetId) {
    throw new Error("Gallery boundary items have no stable ids.");
  }
  const source = page.locator(
    `[data-gallery-id="${sourceId}"] [data-gallery-select]`,
  );
  const target = page.locator(`[data-gallery-id="${targetId}"]`);
  await target.scrollIntoViewIfNeeded();
  const targetBounds = await target.boundingBox();
  if (!targetBounds) {
    throw new Error("Gallery boundary target has no visible bounds.");
  }
  const fixedPoint = {
    clientX: targetBounds.x + targetBounds.width / 2 - 1,
    clientY: targetBounds.y + targetBounds.height / 2,
  };

  const session = await beginDrag(page, source);
  await dragOverAt(session, target, fixedPoint);
  const firstPreviewOrder = await items.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gallery-id") ?? ""),
  );
  expect(firstPreviewOrder).not.toEqual(initialIds);

  await page.waitForTimeout(32);
  await dragOverAt(session, target, fixedPoint);
  const repeatedPreviewOrder = await items.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gallery-id") ?? ""),
  );
  expect(
    repeatedPreviewOrder,
    "The same pointer coordinate must keep the same preview placement.",
  ).toEqual(firstPreviewOrder);

  await page.waitForTimeout(180);
  const movedTargetBounds = await target.boundingBox();
  if (!movedTargetBounds) {
    throw new Error("Gallery boundary target moved out of view.");
  }
  await dragOverAt(session, target, {
    clientX: movedTargetBounds.x + movedTargetBounds.width - 1,
    clientY: movedTargetBounds.y + movedTargetBounds.height / 2,
  });
  const intentionalPreviewOrder = await items.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gallery-id") ?? ""),
  );
  expect(
    intentionalPreviewOrder,
    "Moving beyond the boundary dead zone must select the next placement.",
  ).not.toEqual(firstPreviewOrder);

  await endDrag(session);
  await expect
    .poll(() =>
      items.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-gallery-id") ?? ""),
      ),
    )
    .toEqual(initialIds);

  const gapSourceId = initialIds.at(-1);
  if (!gapSourceId) {
    throw new Error("Gallery gap source has no stable id.");
  }
  const gapSource = page.locator(
    `[data-gallery-id="${gapSourceId}"] [data-gallery-select]`,
  );
  const gapSession = await beginDrag(page, gapSource);
  const gap = await items.evaluateAll((elements, excludedId) => {
    const cards = elements
      .filter(
        (element) =>
          element.getAttribute("data-gallery-id") !== excludedId,
      )
      .map((element) => ({
        id: element.getAttribute("data-gallery-id") ?? "",
        bounds: element.getBoundingClientRect(),
      }));
    let closest:
      | {
          readonly leftId: string;
          readonly rightId: string;
          readonly distance: number;
          readonly point: DragPoint;
        }
      | undefined;

    for (let leftIndex = 0; leftIndex < cards.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < cards.length;
        rightIndex += 1
      ) {
        const first = cards[leftIndex];
        const second = cards[rightIndex];
        if (!first || !second) {
          continue;
        }
        const [left, right] =
          first.bounds.left < second.bounds.left
            ? [first, second]
            : [second, first];
        const overlapTop = Math.max(
          left.bounds.top,
          right.bounds.top,
        );
        const overlapBottom = Math.min(
          left.bounds.bottom,
          right.bounds.bottom,
        );
        const horizontalGap = right.bounds.left - left.bounds.right;
        if (
          horizontalGap <= 1 ||
          overlapBottom - overlapTop <=
            Math.min(left.bounds.height, right.bounds.height) / 2 ||
          (closest && closest.distance <= horizontalGap)
        ) {
          continue;
        }
        closest = {
          leftId: left.id,
          rightId: right.id,
          distance: horizontalGap,
          point: {
            clientX: left.bounds.right + horizontalGap / 2,
            clientY: overlapTop + (overlapBottom - overlapTop) / 2,
          },
        };
      }
    }
    return closest ?? null;
  }, gapSourceId);
  if (!gap) {
    throw new Error("Gallery has no horizontal card gap to test.");
  }

  await dragOverAt(gapSession, grid, gap.point);
  const gapPreviewOrder = await items.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gallery-id") ?? ""),
  );
  const gapSourceIndex = gapPreviewOrder.indexOf(gapSourceId);
  expect(gapPreviewOrder[gapSourceIndex - 1]).toBe(gap.leftId);
  expect(gapPreviewOrder[gapSourceIndex + 1]).toBe(gap.rightId);
  await expect(
    grid.locator("[data-item-drop='inline-before']"),
  ).toHaveCount(1);

  await page.waitForTimeout(32);
  await dragOverAt(gapSession, grid, gap.point);
  await expect
    .poll(() =>
      items.evaluateAll((elements) =>
        elements.map(
          (element) => element.getAttribute("data-gallery-id") ?? "",
        ),
      ),
    )
    .toEqual(gapPreviewOrder);
  await endDrag(gapSession);
  await expect
    .poll(() =>
      items.evaluateAll((elements) =>
        elements.map(
          (element) => element.getAttribute("data-gallery-id") ?? "",
        ),
      ),
    )
    .toEqual(initialIds);
});

test("Gallery Workbench toolbar remains reachable at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/admin/gallery/");

  const toolbar = page.locator("[data-gallery-toolbar-actions]");
  const result = await toolbar.evaluate((actions) => {
    const folder = actions.querySelector<HTMLElement>(
      "[data-gallery-import]",
    );
    const publish = actions.querySelector<HTMLElement>(
      "[data-gallery-publish]",
    );
    const logout = actions.querySelector<HTMLElement>(
      "[data-gallery-logout]",
    );
    if (!folder || !publish || !logout) {
      throw new Error("Gallery toolbar controls are missing.");
    }

    const container = actions.getBoundingClientRect();
    const folderBounds = folder.getBoundingClientRect();
    const folderInitiallyVisible =
      folderBounds.left >= container.left - 1 &&
      folderBounds.right <= container.right + 1;
    actions.scrollLeft = actions.scrollWidth;
    const publishBounds = publish.getBoundingClientRect();
    const logoutBounds = logout.getBoundingClientRect();

    return {
      folderInitiallyVisible,
      publishAfterScroll:
        publishBounds.left >= container.left - 1 &&
        publishBounds.right <= container.right + 1,
      logoutAfterScroll:
        logoutBounds.left >= container.left - 1 &&
        logoutBounds.right <= container.right + 1,
      scrollable: actions.scrollWidth > actions.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });

  expect(result.folderInitiallyVisible).toBe(true);
  expect(result.publishAfterScroll).toBe(true);
  expect(result.logoutAfterScroll).toBe(true);
  expect(result.scrollable).toBe(true);
  expect(result.pageWidth).toBeLessThanOrEqual(result.viewportWidth);
});
