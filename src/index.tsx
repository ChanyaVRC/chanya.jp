import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { raw } from "hono/html";
import { Document } from "./renderer";
import { pageMetadata, site } from "./data/site";
import {
  AboutPage,
  AdminGalleryPage,
  ContactPage,
  DevelopmentPage,
  GalleryPage,
  HomePage,
  NotFoundPage,
  OtherPage,
  RuntimeHtmlPage,
} from "./pages";
import {
  GalleryAccessError,
  assertGalleryMutationRequest,
  authenticateGalleryAdmin,
  createGalleryCsrfToken,
  galleryCsrfCookie,
  type GalleryAdminIdentity,
} from "./gallery/access";
import {
  galleryDraftUpdateSchema,
  galleryPublishRequestSchema,
  type GalleryManifest,
} from "./gallery/manifest";
import {
  GalleryStoreConflictError,
  GalleryMutationReuseError,
  hasGalleryStore,
  loadDraftManifest,
  loadPublishedManifest,
  publishDraftManifest,
  saveDraftManifest,
} from "./gallery/store";
import type { PageMetadata } from "./types";

interface AppVariables {
  readonly galleryAdmin: GalleryAdminIdentity;
}

type AppEnvironment = {
  Bindings: CloudflareBindings;
  Variables: AppVariables;
};
type AppContext = Context<AppEnvironment>;

const app = new Hono<AppEnvironment>();

const canonicalPaths = new Set([
  "/about",
  "/gallery",
  "/development",
  "/contact",
  "/other",
  "/products/contents/RuntimeHtml",
]);

function renderPage(
  c: AppContext,
  metadata: PageMetadata,
  content: Parameters<typeof Document>[0]["children"],
  status: 200 | 404 | 500 = 200,
  clientEntry?: "admin",
) {
  return c.html(
    <>
      {raw("<!doctype html>")}
      <Document
        metadata={metadata}
        currentPath={metadata.path}
        {...(clientEntry ? { clientEntry } : {})}
      >
        {content}
      </Document>
    </>,
    status,
  );
}

app.use("*", async (c, next) => {
  if (c.req.method === "GET" && canonicalPaths.has(c.req.path)) {
    const url = new URL(c.req.url);
    url.pathname = `${url.pathname}/`;
    return c.redirect(url.toString(), 308);
  }

  const scriptNonce = crypto.randomUUID().replaceAll("-", "");
  await next();

  const isRuntimeHtml =
    c.req.path === pageMetadata.runtimeHtml.path ||
    c.req.path === pageMetadata.runtimeHtml.path.slice(0, -1);
  const isAdmin = c.req.path.startsWith("/admin/gallery");
  const developmentDirectives = import.meta.env.DEV
    ? " 'unsafe-inline' 'unsafe-eval'"
    : "";
  const scriptSource = isRuntimeHtml
    ? `script-src 'self' 'unsafe-inline'${import.meta.env.DEV ? " 'unsafe-eval'" : ""}`
    : `script-src 'self' 'nonce-${scriptNonce}'${developmentDirectives}`;
  const connectSource = import.meta.env.DEV
    ? "connect-src 'self' ws: http:"
    : "connect-src 'self'";
  const frameSource = isRuntimeHtml
    ? "frame-src 'self' blob: data:"
    : "frame-src 'none'";

  c.header(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      scriptSource,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      connectSource,
      frameSource,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  c.header("Cross-Origin-Resource-Policy", "same-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");

  if (c.res.headers.get("content-type")?.includes("text/html")) {
    c.header(
      "Cache-Control",
      isAdmin
        ? "private, no-store"
        : isRuntimeHtml
        ? "public, max-age=0, must-revalidate, no-transform"
        : "public, max-age=0, must-revalidate",
    );
  }
  if (isAdmin) {
    c.header("Cache-Control", "private, no-store");
    c.header("X-Robots-Tag", "noindex, nofollow");
  }
});

app.use("/admin/gallery/*", async (c, next) => {
  try {
    c.set("galleryAdmin", await authenticateGalleryAdmin(c.req.raw, c.env));
    await next();
  } catch (error) {
    if (!(error instanceof GalleryAccessError)) {
      throw error;
    }

    c.header("Cache-Control", "private, no-store");
    c.header("X-Robots-Tag", "noindex, nofollow");
    if (c.req.path.includes("/api/")) {
      return c.json({ error: error.message }, error.status);
    }
    return c.text(error.message, error.status);
  }
});

app.get("/", (c) => renderPage(c, pageMetadata.home, <HomePage />));
app.get("/about/", (c) =>
  renderPage(c, pageMetadata.about, <AboutPage />),
);
app.get("/gallery/", async (c) => {
  const manifest = await loadPublishedManifest(c.env?.GALLERY_BUCKET);
  return renderPage(
    c,
    pageMetadata.gallery,
    <GalleryPage manifest={manifest} />,
  );
});
app.get("/development/", (c) =>
  renderPage(c, pageMetadata.development, <DevelopmentPage />),
);
app.get("/contact/", (c) =>
  renderPage(c, pageMetadata.contact, <ContactPage />),
);
app.get("/other/", (c) =>
  renderPage(c, pageMetadata.other, <OtherPage />),
);
app.get("/products/contents/RuntimeHtml/", (c) =>
  renderPage(c, pageMetadata.runtimeHtml, <RuntimeHtmlPage />),
);

app.get("/admin/gallery", (c) => {
  const url = new URL(c.req.url);
  url.pathname = "/admin/gallery/";
  return c.redirect(url.toString(), 308);
});

app.get("/admin/gallery/", async (c) => {
  const manifest = await loadDraftManifest(c.env?.GALLERY_BUCKET);
  const csrfToken = createGalleryCsrfToken(c.req.raw);
  c.header(
    "Set-Cookie",
    galleryCsrfCookie(
      csrfToken,
      new URL(c.req.url).protocol === "https:",
    ),
  );
  return renderPage(
    c,
    {
      title: "Gallery Workbench — Chanya.jp",
      description: "VRChatギャラリーの下書き編集と公開。",
      path: "/admin/gallery/",
      robots: "noindex, nofollow",
    },
    <AdminGalleryPage
      manifest={manifest}
      actor={c.get("galleryAdmin").email}
      csrfToken={csrfToken}
    />,
    200,
    "admin",
  );
});

function auditGalleryMutation(
  c: AppContext,
  action: "save-draft" | "publish" | "upload",
  result: "success" | "conflict" | "failure",
  revision?: number,
): void {
  console.info(
    JSON.stringify({
      event: "gallery.mutation",
      action,
      result,
      revision,
      actor: "gallery-admin",
      requestId: c.req.header("Cf-Ray") ?? crypto.randomUUID(),
    }),
  );
}

app.get("/admin/gallery/api/draft", async (c) => {
  return c.json({
    manifest: await loadDraftManifest(c.env?.GALLERY_BUCKET),
  });
});

app.get("/admin/gallery/api/published", async (c) => {
  return c.json({
    manifest: await loadPublishedManifest(c.env?.GALLERY_BUCKET),
  });
});

app.put("/admin/gallery/api/draft", async (c) => {
  try {
    assertGalleryMutationRequest(c.req.raw);
    const bucket = c.env?.GALLERY_BUCKET;
    if (!hasGalleryStore(bucket)) {
      return c.json({ error: "Gallery storage is unavailable." }, 503);
    }

    const parsed = galleryDraftUpdateSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      return c.json(
        { error: "Gallery draft is invalid.", issues: parsed.error.issues },
        400,
      );
    }

    const manifest = await saveDraftManifest(bucket, parsed.data);
    auditGalleryMutation(c, "save-draft", "success", manifest.version);
    c.header("ETag", `"gallery-${String(manifest.version)}"`);
    return c.json({ manifest });
  } catch (error) {
    if (error instanceof GalleryAccessError) {
      auditGalleryMutation(c, "save-draft", "failure");
      return c.json({ error: error.message }, error.status);
    }
    if (error instanceof GalleryStoreConflictError) {
      auditGalleryMutation(
        c,
        "save-draft",
        "conflict",
        error.canonical.version,
      );
      return c.json(
        {
          error: "The gallery changed before this draft was saved.",
          manifest: error.canonical,
        },
        409,
      );
    }
    if (error instanceof GalleryMutationReuseError) {
      auditGalleryMutation(c, "save-draft", "conflict");
      return c.json(
        { error: "Mutation id was already used for different content." },
        409,
      );
    }
    throw error;
  }
});

async function hasMissingManagedAsset(
  bucket: R2Bucket,
  manifest: GalleryManifest,
): Promise<boolean> {
  const keys = Array.from(
    new Set(
      manifest.items.flatMap((item) =>
        item.source.kind === "managed" ? [item.source.key] : [],
      ),
    ),
  );
  for (let index = 0; index < keys.length; index += 20) {
    const objects = await Promise.all(
      keys
        .slice(index, index + 20)
        .map((key) => bucket.head(`assets/${key}`)),
    );
    if (objects.some((object) => object === null)) {
      return true;
    }
  }
  return false;
}

app.post("/admin/gallery/api/publish", async (c) => {
  try {
    assertGalleryMutationRequest(c.req.raw);
    const bucket = c.env?.GALLERY_BUCKET;
    if (!hasGalleryStore(bucket)) {
      return c.json({ error: "Gallery storage is unavailable." }, 503);
    }

    const request = galleryPublishRequestSchema.safeParse(await c.req.json());
    if (!request.success) {
      return c.json({ error: "Publish request is invalid." }, 400);
    }

    const draft = await loadDraftManifest(bucket);
    if (draft.version !== request.data.baseVersion) {
      return c.json(
        {
          error: "The draft changed before it was published.",
          manifest: draft,
        },
        409,
      );
    }
    if (await hasMissingManagedAsset(bucket, draft)) {
      return c.json(
        { error: "One or more managed images are unavailable." },
        422,
      );
    }

    const manifest = await publishDraftManifest(bucket, request.data);
    auditGalleryMutation(c, "publish", "success", manifest.version);
    c.header("ETag", `"gallery-${String(manifest.version)}"`);
    return c.json({ manifest });
  } catch (error) {
    if (error instanceof GalleryAccessError) {
      auditGalleryMutation(c, "publish", "failure");
      return c.json({ error: error.message }, error.status);
    }
    if (error instanceof GalleryStoreConflictError) {
      auditGalleryMutation(
        c,
        "publish",
        "conflict",
        error.canonical.version,
      );
      return c.json(
        {
          error: "The draft changed before it was published.",
          manifest: error.canonical,
        },
        409,
      );
    }
    if (error instanceof GalleryMutationReuseError) {
      auditGalleryMutation(c, "publish", "conflict");
      return c.json(
        { error: "Mutation id was already used for different content." },
        409,
      );
    }
    throw error;
  }
});

function imageContentType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

const managedGalleryKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

app.post(
  "/admin/gallery/api/assets",
  bodyLimit({
    maxSize: 21 * 1024 * 1024,
    onError: (c) =>
      c.json({ error: "Image upload is too large." }, 413),
  }),
  async (c) => {
  try {
    assertGalleryMutationRequest(c.req.raw);
    const bucket = c.env?.GALLERY_BUCKET;
    const images = c.env?.IMAGES;
    if (!hasGalleryStore(bucket) || !images) {
      return c.json({ error: "Gallery image storage is unavailable." }, 503);
    }

    const body = await c.req.formData();
    const file = body.get("file");
    const assetId = body.get("assetId");
    if (!(file instanceof File) || file.size === 0) {
      return c.json({ error: "An image file is required." }, 400);
    }
    if (
      typeof assetId !== "string" ||
      !managedGalleryKeyPattern.test(assetId)
    ) {
      return c.json({ error: "A valid asset id is required." }, 400);
    }
    if (file.size > 20 * 1024 * 1024) {
      return c.json({ error: "Images must be 20 MB or smaller." }, 413);
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const contentType = imageContentType(bytes);
    if (!contentType) {
      return c.json({ error: "Only JPEG, PNG, and WebP are supported." }, 415);
    }

    const info = await images.info(
      new Response(buffer).body!,
    );
    if (
      !("width" in info) ||
      info.width < 1 ||
      info.height < 1 ||
      info.width > 16_384 ||
      info.height > 16_384 ||
      info.width * info.height > 50_000_000
    ) {
      return c.json({ error: "Image dimensions are not supported." }, 422);
    }

    const contentHash = await sha256Hex(buffer);
    const key = assetId;
    const object = await bucket.put(
      `assets/${key}`,
      buffer,
      {
        onlyIf: { etagDoesNotMatch: "*" },
        httpMetadata: { contentType },
        customMetadata: {
          width: String(info.width),
          height: String(info.height),
          sha256: contentHash,
        },
      },
    );
    if (!object) {
      const existing = await bucket.head(`assets/${key}`);
      const existingWidth = Number(existing?.customMetadata?.width);
      const existingHeight = Number(existing?.customMetadata?.height);
      if (
        existing?.customMetadata?.sha256 !== contentHash ||
        !Number.isInteger(existingWidth) ||
        !Number.isInteger(existingHeight)
      ) {
        return c.json({ error: "Image key conflict. Please retry." }, 409);
      }

      auditGalleryMutation(c, "upload", "success");
      return c.json({
        asset: {
          key,
          width: existingWidth,
          height: existingHeight,
        },
      });
    }

    auditGalleryMutation(c, "upload", "success");
    return c.json({
      asset: {
        key,
        width: info.width,
        height: info.height,
      },
    });
  } catch (error) {
    if (error instanceof GalleryAccessError) {
      auditGalleryMutation(c, "upload", "failure");
      return c.json({ error: error.message }, error.status);
    }
    auditGalleryMutation(c, "upload", "failure");
    throw error;
  }
  },
);

async function serveManagedGalleryImage(
  c: AppContext,
  visibility: "admin" | "public",
): Promise<Response> {
  const key = c.req.param("key");
  const variant = c.req.param("variant");
  if (
    !key ||
    !variant ||
    !managedGalleryKeyPattern.test(key)
  ) {
    return c.notFound();
  }
  const match = variant.match(/^(640|1280|1920)\.(avif|webp)$/u);
  const bucket = c.env?.GALLERY_BUCKET;
  const images = c.env?.IMAGES;
  if (!match || !bucket || !images) {
    return c.notFound();
  }

  if (visibility === "public") {
    const published = await loadPublishedManifest(bucket);
    const isPublished = published.items.some(
      (item) =>
        item.source.kind === "managed" && item.source.key === key,
    );
    if (!isPublished) {
      c.header("Cache-Control", "no-store");
      return c.notFound();
    }
  }

  const object = await bucket.get(`assets/${key}`);
  if (!object) {
    c.header("Cache-Control", "no-store");
    return c.notFound();
  }

  const width = Number(match[1]);
  const format = match[2] === "avif" ? "image/avif" : "image/webp";
  const transformedEtag = `"${object.etag}-${variant}"`;
  if (visibility === "public") {
    const requestEtags =
      c.req.header("If-None-Match")
        ?.split(",")
        .map((value) => value.trim()) ?? [];
    if (requestEtags.includes(transformedEtag)) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": "public, max-age=0, must-revalidate",
          ETag: transformedEtag,
        },
      });
    }
  }

  const transformation = await images
    .input(object.body)
    .transform({ width, fit: "scale-down" })
    .output({
      format,
      quality: match[2] === "avif" ? 82 : 86,
    });
  const response = transformation.response();
  const headers = new Headers(response.headers);
  headers.set(
    "Cache-Control",
    visibility === "public" && response.ok
      ? "public, max-age=0, must-revalidate"
      : "private, no-store",
  );
  headers.set("Content-Type", format);
  headers.set("X-Content-Type-Options", "nosniff");
  if (visibility === "public" && response.ok) {
    headers.set("ETag", transformedEtag);
  }
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

app.get("/admin/gallery/media/:key/:variant", (c) =>
  serveManagedGalleryImage(c, "admin"),
);
app.get("/media/gallery-managed/:key/:variant", (c) =>
  serveManagedGalleryImage(c, "public"),
);

app.get("/robots.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(`User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);
});

app.get("/sitemap.xml", (c) => {
  const paths = [
    pageMetadata.home.path,
    pageMetadata.about.path,
    pageMetadata.gallery.path,
    pageMetadata.development.path,
    pageMetadata.contact.path,
    pageMetadata.other.path,
    pageMetadata.runtimeHtml.path,
  ];
  const urls = paths
    .map((path) => `<url><loc>${new URL(path, site.origin)}</loc></url>`)
    .join("");

  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
  );
});

app.get("/favicon.svg", (c) => {
  c.header("Content-Type", "image/svg+xml; charset=utf-8");
  c.header("Cache-Control", "public, max-age=86400");
  return c.body(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#315ee8"/><path d="M18 18h8l6 8 6-8h8v28h-9V32l-5 7-5-7v14h-9z" fill="#f7f9fc"/></svg>`,
  );
});

app.notFound((c) =>
  renderPage(c, pageMetadata.notFound, <NotFoundPage />, 404),
);

app.onError((error, c) => {
  console.error("Unhandled request error", error);
  return renderPage(
    c,
    {
      title: "Error — Chanya.jp",
      description: "ページを表示できませんでした。",
      path: c.req.path,
    },
    <section>
      <h1>ページを表示できませんでした。</h1>
      <p>少し時間を置いてから、もう一度アクセスしてください。</p>
    </section>,
    500,
  );
});

export default app;
