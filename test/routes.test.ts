import { describe, expect, it } from "vitest";
import app from "../src/index";

const htmlRoutes = [
  { path: "/", title: "Chanya.jp — 九島茶にゃ", heading: "ねこ。多分技術者。" },
  { path: "/about/", title: "About — Chanya.jp", heading: "九島茶にゃ。" },
  {
    path: "/gallery/",
    title: "Gallery — Chanya.jp",
    heading: "Nankotsu.",
  },
  {
    path: "/development/",
    title: "Development — Chanya.jp",
    heading: "作ったもの。",
  },
  {
    path: "/contact/",
    title: "Contact — Chanya.jp",
    heading: "話す場所。",
  },
  {
    path: "/other/",
    title: "Other — Chanya.jp",
    heading: "外にあるもの。",
  },
  {
    path: "/products/contents/RuntimeHtml/",
    title: "RuntimeHtml — Chanya.jp",
    heading: "書く。実行する。外へ出さない。",
  },
] as const;

describe.each(htmlRoutes)("$path", ({ path, title, heading }) => {
  it("HTMLページを返す", async () => {
    const response = await app.request(`https://chanya.jp${path}`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("<!doctype html>");
    expect(body).toContain(`<title>${title}</title>`);
    expect(body).toContain(heading);
    expect(body).toContain(`href="https://chanya.jp${path}"`);
  });
});

describe("canonical URLs", () => {
  it.each([
    "/about",
    "/gallery",
    "/development",
    "/contact",
    "/other",
    "/products/contents/RuntimeHtml",
  ])("%sを末尾スラッシュ付きURLへ転送する", async (path) => {
    const response = await app.request(`https://chanya.jp${path}`);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`https://chanya.jp${path}/`);
  });
});

describe("supporting routes", () => {
  it("robots.txtからsitemapを案内する", async () => {
    const response = await app.request("https://chanya.jp/robots.txt");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Sitemap: https://chanya.jp/sitemap.xml");
  });

  it("sitemapに全公開ページを一度ずつ含める", async () => {
    const response = await app.request("https://chanya.jp/sitemap.xml");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    for (const { path } of htmlRoutes) {
      const entry = `<loc>https://chanya.jp${path}</loc>`;
      expect(body.split(entry)).toHaveLength(2);
    }
  });

  it("未定義ルートに専用404を返す", async () => {
    const response = await app.request(
      "https://chanya.jp/this-route-does-not-exist/",
    );
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(body).toContain("<title>404 — Chanya.jp</title>");
    expect(body).toContain("ここには何もありません。");
    expect(body).toContain('href="/"');
  });
});
