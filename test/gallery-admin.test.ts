import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import {
  defaultGallerySectionId,
  galleryDraftUpdateSchema,
  galleryManifestSchema,
  parseGalleryManifest,
  seedGalleryManifest,
} from "../src/gallery/manifest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gallery manifest", () => {
  it("既存42枚を検証済みのvisual-first manifestへ変換する", () => {
    const manifest = seedGalleryManifest();

    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.sections).toEqual([
      {
        id: defaultGallerySectionId,
        title: "Nankotsu",
        description: "VRChatで撮影した時間と場所の記録。",
      },
    ]);
    expect(manifest.items).toHaveLength(42);
    expect(
      manifest.items.every(
        (item) => item.sectionId === defaultGallerySectionId,
      ),
    ).toBe(true);
    expect(manifest.items.every((item) => !item.layoutLocked)).toBe(true);
    expect(galleryManifestSchema.parse(manifest)).toEqual(manifest);
    expect(
      manifest.items.filter((item) => item.layout === "feature").length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      manifest.items.filter((item) => item.layout === "wide").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("schema version 1を既定セクション付きのversion 2へ移行する", () => {
    const current = seedGalleryManifest();
    const lastMutation = {
      id: "00000000-0000-4000-8000-000000000007",
      channel: "draft" as const,
      requestHash: "a".repeat(64),
    };
    const legacyItems = current.items.map((item) => {
      const { sectionId: _sectionId, ...legacyItem } = item;
      return legacyItem;
    });

    const migrated = parseGalleryManifest({
      schemaVersion: 1,
      version: 7,
      updatedAt: "2026-07-25T00:00:00.000Z",
      lastMutation,
      items: legacyItems,
    });

    expect(migrated).toMatchObject({
      schemaVersion: 2,
      version: 7,
      updatedAt: "2026-07-25T00:00:00.000Z",
      lastMutation,
      sections: [
        {
          id: defaultGallerySectionId,
          title: "Nankotsu",
        },
      ],
    });
    expect(migrated.items.map((item) => item.id)).toEqual(
      legacyItems.map((item) => item.id),
    );
    expect(
      migrated.items.every(
        (item) => item.sectionId === defaultGallerySectionId,
      ),
    ).toBe(true);
    expect(migrated.items.every((item) => !item.layoutLocked)).toBe(true);
  });

  it("重複ID・不明なセクション・範囲外の焦点位置を拒否する", () => {
    const manifest = seedGalleryManifest();
    const duplicateItem = {
      ...manifest,
      items: [
        manifest.items[0],
        {
          ...manifest.items[1],
          id: manifest.items[0]!.id,
        },
      ],
    };
    const invalidFocalPoint = {
      ...manifest,
      items: [
        {
          ...manifest.items[0],
          focalPoint: { x: 1.1, y: 0.5 },
        },
      ],
    };
    const duplicateSection = {
      ...manifest,
      sections: [manifest.sections[0], manifest.sections[0]],
    };
    const unknownSection = {
      ...manifest,
      items: [
        {
          ...manifest.items[0],
          sectionId: "00000000-0000-4000-8000-000000000099",
        },
      ],
    };

    expect(galleryManifestSchema.safeParse(duplicateItem).success).toBe(false);
    expect(galleryManifestSchema.safeParse(invalidFocalPoint).success).toBe(
      false,
    );
    expect(galleryManifestSchema.safeParse(duplicateSection).success).toBe(
      false,
    );
    expect(galleryManifestSchema.safeParse(unknownSection).success).toBe(
      false,
    );
  });

  it("section順にitemsを正規化し、各section内の写真順を保つ", () => {
    const manifest = seedGalleryManifest();
    const secondSectionId = "00000000-0000-4000-8000-000000000002";
    const first = manifest.items[0]!;
    const second = manifest.items[1]!;
    const third = manifest.items[2]!;

    const parsed = galleryManifestSchema.parse({
      ...manifest,
      sections: [
        manifest.sections[0],
        {
          id: secondSectionId,
          title: "Second",
          description: "",
        },
      ],
      items: [
        first,
        { ...second, sectionId: secondSectionId },
        third,
      ],
    });

    expect(parsed.items.map((item) => item.id)).toEqual([
      first.id,
      third.id,
      second.id,
    ]);
  });

  it("下書き更新にbaseVersion・mutationId・sectionsを要求する", () => {
    const manifest = seedGalleryManifest();

    const parsed = galleryDraftUpdateSchema.safeParse({
      baseVersion: manifest.version,
      mutationId: crypto.randomUUID(),
      sections: manifest.sections,
      items: manifest.items,
    });

    expect(parsed.success).toBe(true);
    expect(
      galleryDraftUpdateSchema.safeParse({
        baseVersion: manifest.version,
        mutationId: crypto.randomUUID(),
        items: manifest.items,
      }).success,
    ).toBe(false);
  });
});

describe("gallery admin boundary", () => {
  const managedKey = "7cc2ac97-23d5-46fd-8b33-5f45275474dc";

  function configuredGalleryEnv(
    environment: "preview" | "production",
  ): CloudflareBindings {
    return {
      GALLERY_BUCKET: {} as R2Bucket,
      IMAGES: {} as ImagesBinding,
      CF_ACCESS_TEAM_DOMAIN:
        "https://chanyakushima.cloudflareaccess.com",
      CF_ACCESS_AUD:
        "08f4b21524ee5e79efaaa746e84959d1270a483459856b45c9aeb180e4c0941c",
      GALLERY_ENVIRONMENT: environment,
      GALLERY_CANONICAL_HOST: "chanya.jp",
      GALLERY_ADMIN_EMAIL: "admin@example.com",
    };
  }

  function mockR2Bucket(overrides: object): R2Bucket {
    return overrides as R2Bucket;
  }

  function mockImagesBinding(
    overrides: object,
  ): ImagesBinding {
    return overrides as ImagesBinding;
  }

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
    expect(body).toContain('data-gallery-canvas');
    expect(body).toContain('data-gallery-section');
    expect(body).toContain(`data-section-id="${defaultGallerySectionId}"`);
    expect(body).toContain('data-section-select');
    expect(body).toContain('data-section-add');
    expect(body).toContain('data-inspector-section');
    expect(body.match(/data-gallery-layout-lock-mark/g)).toHaveLength(42);
    expect(body.match(/data-gallery-select/g)).toHaveLength(42);
    expect(body).toContain("/src/admin-client.ts");
  });

  it("本番ホストはAccess未設定時にfail closedする", async () => {
    const response = await app.request("https://chanya.jp/admin/gallery/");

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it.each([
    ["PUT", "/admin/gallery/api/draft"],
    ["POST", "/admin/gallery/api/publish"],
    ["POST", "/admin/gallery/api/assets"],
    ["DELETE", `/admin/gallery/api/assets/${managedKey}`],
  ])(
    "production bindingのworkers.devでは%s %sをAccess検証前に拒否する",
    async (method, path) => {
      const response = await app.request(
        `https://branch-chanya-jp.example.workers.dev${path}`,
        { method },
        configuredGalleryEnv("production"),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Gallery mutations are disabled on this host.",
      });
    },
  );

  it("preview environmentはworkers.devの書込みをhost guardで許可する", async () => {
    const response = await app.request(
      "https://branch-chanya-jp.example.workers.dev/admin/gallery/api/draft",
      { method: "PUT" },
      configuredGalleryEnv("preview"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Cloudflare Access token is missing.",
    });
  });

  it("production bindingの非canonical hostでは公開GalleryもR2を読まない", async () => {
    const get = vi.fn(async () => {
      throw new Error("Production R2 must not be read from a preview host.");
    });
    const env = {
      ...configuredGalleryEnv("production"),
      GALLERY_BUCKET: mockR2Bucket({ get }),
    };

    const gallery = await app.request(
      "https://branch-chanya-jp.example.workers.dev/gallery/",
      undefined,
      env,
    );
    const image = await app.request(
      `https://branch-chanya-jp.example.workers.dev/media/gallery-managed/${managedKey}/640.webp`,
      undefined,
      env,
    );

    expect(gallery.status).toBe(200);
    expect(image.status).toBe(404);
    expect(get).not.toHaveBeenCalled();
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
          sections: seedGalleryManifest().sections,
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
          sections: seedGalleryManifest().sections,
          items: seedGalleryManifest().items,
        }),
      },
    );

    expect(response.status).toBe(503);
  });

  it("state commit後の履歴保存失敗をretryable 503として返す", async () => {
    const page = await app.request("http://localhost/admin/gallery/");
    const cookie = page.headers
      .get("set-cookie")
      ?.match(/gallery_csrf=([^;]+)/u)?.[1];
    expect(cookie).toBeDefined();

    const get = vi.fn(async () => null);
    const put = vi.fn(async (key: string) => {
      if (key.startsWith("mutations/draft/")) {
        throw new Error("Injected mutation receipt failure.");
      }
      return { etag: "stored-etag" } as R2Object;
    });
    const env = {
      ...configuredGalleryEnv("production"),
      GALLERY_BUCKET: mockR2Bucket({ get, put }),
    };
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
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
            sections: seedGalleryManifest().sections,
            items: seedGalleryManifest().items,
          }),
        },
        env,
      );

      expect(response.status).toBe(503);
      expect(response.headers.get("retry-after")).toBe("1");
      await expect(response.json()).resolves.toMatchObject({
        retryable: true,
      });
    } finally {
      errorLog.mockRestore();
    }
  });

  it("公開Galleryをsection順と所属写真順で描画する", async () => {
    const seed = seedGalleryManifest();
    const secondSectionId = "00000000-0000-4000-8000-000000000021";
    const emptySectionId = "00000000-0000-4000-8000-000000000022";
    const published = galleryManifestSchema.parse({
      ...seed,
      sections: [
        {
          id: secondSectionId,
          title: "Night Sessions",
          description: "夜の記録。",
        },
        seed.sections[0],
        {
          id: emptySectionId,
          title: "Next Session",
          description: "",
        },
      ],
      items: [
        seed.items[0],
        { ...seed.items[1], sectionId: secondSectionId },
        seed.items[2],
      ],
    });
    const get = vi.fn(async () => ({
      etag: "state-etag",
      json: async () => ({
        schemaVersion: 1,
        draft: published,
        published,
      }),
    }));
    const env = {
      GALLERY_BUCKET: { get } as unknown as R2Bucket,
    } as CloudflareBindings;

    const response = await app.request(
      "http://localhost/gallery/",
      undefined,
      env,
    );
    const body = await response.text();
    const secondStart = body.indexOf(`data-section-id="${secondSectionId}"`);
    const defaultStart = body.indexOf(
      `data-section-id="${defaultGallerySectionId}"`,
    );
    const emptyStart = body.indexOf(`data-section-id="${emptySectionId}"`);
    const secondBlock = body.slice(secondStart, defaultStart);
    const defaultBlock = body.slice(defaultStart, emptyStart);
    const emptyBlock = body.slice(emptyStart);

    expect(response.status).toBe(200);
    expect(secondStart).toBeGreaterThan(-1);
    expect(defaultStart).toBeGreaterThan(secondStart);
    expect(emptyStart).toBeGreaterThan(defaultStart);
    expect(secondBlock).toContain('data-gallery-id="nankotsu-02"');
    expect(secondBlock).not.toContain('data-gallery-id="nankotsu-01"');
    expect(defaultBlock).toContain('data-gallery-id="nankotsu-01"');
    expect(defaultBlock).toContain('data-gallery-id="nankotsu-03"');
    expect(emptyBlock).toContain("Next Session");
    expect(emptyBlock).not.toContain("data-gallery-id=");
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

  it("公開managed画像はmembershipを毎回確認し、etag単位の変換cacheを使う", async () => {
    const seed = seedGalleryManifest();
    const first = seed.items[0];
    if (!first) {
      throw new Error("The seed gallery must contain an item.");
    }
    const published = galleryManifestSchema.parse({
      ...seed,
      items: [
        {
          ...first,
          id: managedKey,
          source: { kind: "managed", key: managedKey },
        },
      ],
    });
    const assetKey = `assets/${managedKey}`;
    const get = vi.fn(async (key: string) => {
      if (key === "manifests/state.json") {
        return {
          etag: "state-etag",
          json: async () => ({
            schemaVersion: 1,
            draft: published,
            published,
          }),
        };
      }
      if (key === assetKey) {
        return {
          etag: "source-etag",
          body: new Blob(["source-image"]).stream(),
        };
      }
      return null;
    });
    const head = vi.fn(async (key: string) =>
      key === assetKey ? { etag: "source-etag" } : null,
    );
    const output = vi.fn(async () => ({
      response: () =>
        new Response("transformed-image", {
          headers: { "Content-Type": "image/webp" },
        }),
    }));
    const transform = vi.fn(() => ({ output }));
    const input = vi.fn(() => ({ transform }));
    const env = {
      ...configuredGalleryEnv("production"),
      GALLERY_BUCKET: mockR2Bucket({ get, head }),
      IMAGES: mockImagesBinding({ input }),
    };

    let cachedResponse: Response | undefined;
    const cacheMatch = vi.fn(async () => cachedResponse?.clone());
    const cachePut = vi.fn(async (_key: Request, response: Response) => {
      cachedResponse = response.clone();
    });
    vi.stubGlobal("caches", {
      default: {
        match: cacheMatch,
        put: cachePut,
      },
    });
    const pending: Promise<unknown>[] = [];
    const executionContext = {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise);
      },
      passThroughOnException() {},
    } as ExecutionContext;
    const imageUrl =
      `https://chanya.jp/media/gallery-managed/${managedKey}/640.webp`;

    const uncached = await app.request(
      imageUrl,
      undefined,
      env,
      executionContext,
    );
    const transformedEtag = uncached.headers.get("etag");
    expect(uncached.status).toBe(200);
    expect(await uncached.text()).toBe("transformed-image");
    expect(transformedEtag).toContain(
      "source-etag-640.webp-v1-fit-scale-down-q86",
    );
    await Promise.all(pending.splice(0));

    const cached = await app.request(
      imageUrl,
      undefined,
      env,
      executionContext,
    );
    expect(cached.status).toBe(200);
    expect(cached.headers.get("cache-control")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(await cached.text()).toBe("transformed-image");

    const notModified = await app.request(
      imageUrl,
      {
        headers: { "If-None-Match": transformedEtag ?? "" },
      },
      env,
      executionContext,
    );
    expect(notModified.status).toBe(304);

    expect(input).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledTimes(1);
    expect(cacheMatch).toHaveBeenCalledTimes(2);
    expect(cachePut).toHaveBeenCalledTimes(1);
    expect(head).toHaveBeenCalledTimes(3);
    expect(
      get.mock.calls.filter(([key]) => key === "manifests/state.json"),
    ).toHaveLength(3);
    expect(
      get.mock.calls.filter(([key]) => key === assetKey),
    ).toHaveLength(1);
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
