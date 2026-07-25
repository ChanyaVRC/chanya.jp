import { describe, expect, it, vi } from "vitest";
import app from "../src/index";
import {
  galleryDraftUpdateSchema,
  galleryManifestSchema,
  seedGalleryManifest,
} from "../src/gallery/manifest";

describe("gallery manifest", () => {
  it("既存42枚を検証済みのvisual-first manifestへ変換する", () => {
    const manifest = seedGalleryManifest();

    expect(manifest.items).toHaveLength(42);
    expect(galleryManifestSchema.parse(manifest)).toEqual(manifest);
    expect(
      manifest.items.filter((item) => item.layout === "feature").length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      manifest.items.filter((item) => item.layout === "wide").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("重複IDと範囲外の焦点位置を拒否する", () => {
    const manifest = seedGalleryManifest();
    const duplicate = {
      ...manifest,
      items: [
        manifest.items[0],
        {
          ...manifest.items[0],
          focalPoint: { x: 1.1, y: 0.5 },
        },
      ],
    };

    expect(galleryManifestSchema.safeParse(duplicate).success).toBe(false);
  });

  it("下書き更新にbaseVersionとmutationIdを要求する", () => {
    const manifest = seedGalleryManifest();

    expect(
      galleryDraftUpdateSchema.safeParse({
        baseVersion: manifest.version,
        mutationId: crypto.randomUUID(),
        items: manifest.items,
      }).success,
    ).toBe(true);
    expect(
      galleryDraftUpdateSchema.safeParse({
        baseVersion: manifest.version,
        items: manifest.items,
      }).success,
    ).toBe(false);
  });
});

describe("gallery admin boundary", () => {
  const managedKey = "7cc2ac97-23d5-46fd-8b33-5f45275474dc";

  it("localhostだけは開発用Workbenchを表示する", async () => {
    const response = await app.request("http://localhost/admin/gallery/");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("set-cookie")).toContain(
      "gallery_csrf=",
    );
    expect(body).toContain("Gallery Workbench");
    expect(body).toContain("GitHub Access");
    expect(body).toContain('href="/cdn-cgi/access/logout"');
    expect(body).toContain('data-gallery-admin');
    expect(body).toContain('data-gallery-bootstrap');
    expect(body.match(/data-gallery-select/g)).toHaveLength(42);
    expect(body).toContain("/src/admin-client.ts");
  });

  it("本番ホストはAccess未設定時にfail closedする", async () => {
    const response = await app.request("https://chanya.jp/admin/gallery/");

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("更新APIはOrigin・管理ヘッダー・CSRFなしの要求を拒否する", async () => {
    const response = await app.request(
      "http://localhost/admin/gallery/api/draft",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseVersion: 1,
          mutationId: crypto.randomUUID(),
          items: seedGalleryManifest().items,
        }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("正しい同一origin要求でもR2未接続なら保存しない", async () => {
    const page = await app.request("http://localhost/admin/gallery/");
    const cookie = page.headers
      .get("set-cookie")
      ?.match(/gallery_csrf=([^;]+)/u)?.[1];
    expect(cookie).toBeDefined();

    const response = await app.request(
      "http://localhost/admin/gallery/api/draft",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
          Cookie: `gallery_csrf=${cookie}`,
          "X-Gallery-Admin": "1",
          "X-Gallery-CSRF": decodeURIComponent(cookie ?? ""),
        },
        body: JSON.stringify({
          baseVersion: 1,
          mutationId: crypto.randomUUID(),
          items: seedGalleryManifest().items,
        }),
      },
    );

    expect(response.status).toBe(503);
  });

  it("公開manifestにないmanaged画像を公開URLから取得しない", async () => {
    const seed = seedGalleryManifest();
    const get = vi.fn(async (key: string) => {
      if (key !== "manifests/state.json") {
        throw new Error(`Unexpected object read: ${key}`);
      }
      return {
        etag: "state-etag",
        json: async () => ({
          schemaVersion: 1,
          draft: seed,
          published: seed,
        }),
      };
    });
    const env = {
      GALLERY_BUCKET: { get } as unknown as R2Bucket,
      IMAGES: {} as ImagesBinding,
    } as CloudflareBindings;

    const response = await app.request(
      `http://localhost/media/gallery-managed/${managedKey}/640.webp`,
      undefined,
      env,
    );

    expect(response.status).toBe(404);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("manifests/state.json");
  });

  it("下書きpreviewはAccess配下の専用routeだけを使う", async () => {
    const get = vi.fn(async () => null);
    const env = {
      GALLERY_BUCKET: { get } as unknown as R2Bucket,
      IMAGES: {} as ImagesBinding,
    } as CloudflareBindings;

    const response = await app.request(
      `http://localhost/admin/gallery/media/${managedKey}/640.webp`,
      undefined,
      env,
    );

    expect(response.status).toBe(404);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(`assets/${managedKey}`);
  });

  it("同じasset idの再送を同じR2 objectとして冪等に扱う", async () => {
    const pixel = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    const digest = await crypto.subtle.digest("SHA-256", pixel);
    const contentHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    let stored = false;
    const put = vi.fn(async () => {
      if (stored) {
        return null;
      }
      stored = true;
      return { etag: "asset-etag" } as R2Object;
    });
    const head = vi.fn(async () =>
      stored
        ? ({
            customMetadata: {
              width: "1",
              height: "1",
              sha256: contentHash,
            },
          } as unknown as R2Object)
        : null,
    );
    const env = {
      GALLERY_BUCKET: { put, head } as unknown as R2Bucket,
      IMAGES: {
        info: vi.fn(async () => ({ width: 1, height: 1 })),
      } as unknown as ImagesBinding,
    } as CloudflareBindings;
    const page = await app.request("http://localhost/admin/gallery/");
    const cookie = page.headers
      .get("set-cookie")
      ?.match(/gallery_csrf=([^;]+)/u)?.[1];
    expect(cookie).toBeDefined();

    async function upload(): Promise<Response> {
      const body = new FormData();
      body.set(
        "file",
        new File([pixel], "VRChat_2026-07-25.png", {
          type: "image/png",
        }),
      );
      body.set("assetId", managedKey);
      return app.request(
        "http://localhost/admin/gallery/api/assets",
        {
          method: "POST",
          headers: {
            Origin: "http://localhost",
            Cookie: `gallery_csrf=${cookie}`,
            "X-Gallery-Admin": "1",
            "X-Gallery-CSRF": decodeURIComponent(cookie ?? ""),
          },
          body,
        },
        env,
      );
    }

    const first = await upload();
    const retry = await upload();

    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({
      asset: { key: managedKey, width: 1, height: 1 },
    });
    await expect(retry.json()).resolves.toMatchObject({
      asset: { key: managedKey, width: 1, height: 1 },
    });
    expect(put).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenCalledWith(
      `assets/${managedKey}`,
      expect.any(ArrayBuffer),
      expect.objectContaining({
        onlyIf: { etagDoesNotMatch: "*" },
      }),
    );
    expect(head).toHaveBeenCalledWith(`assets/${managedKey}`);
  });
});
