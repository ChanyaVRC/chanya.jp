import { describe, expect, it } from "vitest";
import app from "../src/index";
import { galleryItems } from "../src/data/gallery";
import { buildRuntimeDocument } from "../src/runtime-policy";
import type { GalleryItem } from "../src/types";

describe("typed gallery data", () => {
  const typedItems: readonly GalleryItem[] = galleryItems;

  it("42件の一意な作品を持つ", () => {
    expect(typedItems).toHaveLength(42);
    expect(new Set(typedItems.map((item) => item.id)).size).toBe(42);
    expect(new Set(typedItems.map((item) => item.title)).size).toBe(42);
  });

  it("各作品に有効な表示データを持つ", () => {
    for (const item of typedItems) {
      expect(item.id).toMatch(/^nankotsu-\d{2}$/);
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(item.alt.trim().length).toBeGreaterThan(0);
      expect(item.width).toBe(1920);
      expect(item.height).toBe(1080);
      if (item.date !== null) {
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(item.date))).toBe(false);
      }
    }
  });

  it("ギャラリーページに42個の拡大ボタンを描画する", async () => {
    const response = await app.request("https://chanya.jp/gallery/");
    const body = await response.text();

    expect(body.match(/data-gallery-open/g)).toHaveLength(42);
  });
});

describe("HTTP security headers", () => {
  it.each(["/", "/about/", "/missing/"])(
    "%sに共通の防御ヘッダーを付ける",
    async (path) => {
      const response = await app.request(`https://chanya.jp${path}`);

      expect(response.headers.get("content-security-policy")).toContain(
        "default-src 'self'",
      );
      expect(response.headers.get("strict-transport-security")).toBe(
        "max-age=31536000; includeSubDomains",
      );
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
      expect(response.headers.get("cross-origin-opener-policy")).toBe(
        "same-origin",
      );
      expect(response.headers.get("cross-origin-resource-policy")).toBe(
        "same-origin",
      );
      expect(response.headers.get("permissions-policy")).toBe(
        "camera=(), microphone=(), geolocation=()",
      );
      expect(response.headers.get("referrer-policy")).toBe(
        "strict-origin-when-cross-origin",
      );
    },
  );

  it("通常ページのframe読み込みを禁止する", async () => {
    const response = await app.request("https://chanya.jp/about/");
    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain("frame-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("Cloudflareの安全なscript注入用nonceをリクエストごとに更新する", async () => {
    const first = await app.request("https://chanya.jp/");
    const second = await app.request("https://chanya.jp/");
    const firstPolicy = first.headers.get("content-security-policy") ?? "";
    const secondPolicy = second.headers.get("content-security-policy") ?? "";
    const noncePattern = /script-src 'self' 'nonce-([0-9a-f]{32})'/;
    const firstNonce = firstPolicy.match(noncePattern)?.[1];
    const secondNonce = secondPolicy.match(noncePattern)?.[1];

    expect(firstNonce).toBeDefined();
    expect(secondNonce).toBeDefined();
    expect(firstNonce).not.toBe(secondNonce);
  });

  it("RuntimeHtmlページだけにローカルpreview用frameを許可する", async () => {
    const response = await app.request(
      "https://chanya.jp/products/contents/RuntimeHtml/",
    );
    const policy = response.headers.get("content-security-policy");
    const body = await response.text();

    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("frame-src 'self' blob: data:");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(response.headers.get("cache-control")).toContain("no-transform");
    expect(body).toContain('sandbox="allow-scripts"');
    expect(body).toContain('referrerpolicy="no-referrer"');
  });
});

describe("RuntimeHtml sandbox document", () => {
  const document = buildRuntimeDocument(
    '<form action="https://example.com"><script>eval("1")</script></form>',
  );

  it("外部通信・フォーム・オブジェクト・base URLをCSPで禁止する", () => {
    expect(document).toContain("default-src 'none'");
    expect(document).toContain("connect-src 'none'");
    expect(document).toContain("form-action 'none'");
    expect(document).toContain("object-src 'none'");
    expect(document).toContain("base-uri 'none'");
  });

  it("inline scriptだけを許可しevalを許可しない", () => {
    expect(document).toContain("script-src 'unsafe-inline'");
    expect(document).not.toContain("'unsafe-eval'");
    expect(document).toContain(
      'Object.defineProperty(globalThis, "eval"',
    );
  });

  it("入力を固定のHTMLシェル内に配置する", () => {
    expect(document).toMatch(/^<!doctype html><html lang="en">/);
    expect(document).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
    expect(document).toContain(
      '<form action="https://example.com"><script>eval("1")</script></form>',
    );
    expect(document).toMatch(/<\/html>$/);
  });
});
