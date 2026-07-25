import { Hono } from "hono";
import type { Context } from "hono";
import { raw } from "hono/html";
import { Document } from "./renderer";
import { pageMetadata, site } from "./data/site";
import {
  AboutPage,
  ContactPage,
  DevelopmentPage,
  GalleryPage,
  HomePage,
  NotFoundPage,
  OtherPage,
  RuntimeHtmlPage,
} from "./pages";
import type { PageMetadata } from "./types";

type AppContext = Context<{ Bindings: CloudflareBindings }>;

const app = new Hono<{ Bindings: CloudflareBindings }>();

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
) {
  return c.html(
    <>
      {raw("<!doctype html>")}
      <Document metadata={metadata} currentPath={metadata.path}>
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
      isRuntimeHtml
        ? "public, max-age=0, must-revalidate, no-transform"
        : "public, max-age=0, must-revalidate",
    );
  }
});

app.get("/", (c) => renderPage(c, pageMetadata.home, <HomePage />));
app.get("/about/", (c) =>
  renderPage(c, pageMetadata.about, <AboutPage />),
);
app.get("/gallery/", (c) =>
  renderPage(c, pageMetadata.gallery, <GalleryPage />),
);
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
