import type { FC, PropsWithChildren } from "hono/jsx";
import { Script, ViteClient } from "vite-ssr-components/hono";
import { CommandPalette, Footer, Header } from "./components/SiteChrome";
import { site } from "./data/site";
import type { PageMetadata } from "./types";
import * as styles from "./styles/site.css";

interface DocumentProps extends PropsWithChildren {
  readonly metadata: PageMetadata;
  readonly currentPath: string;
  readonly clientEntry?: "admin";
}

export const Document: FC<DocumentProps> = ({
  children,
  metadata,
  currentPath,
  clientEntry,
}) => {
  const canonical = new URL(metadata.path, site.origin).toString();

  return (
    <html lang="ja" data-theme="cobalt">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        {metadata.robots ? <meta name="robots" content={metadata.robots} /> : null}
        <meta name="theme-color" content="#f7f9fc" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={site.name} />
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary" />
        <link rel="canonical" href={canonical} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <ViteClient />
        <Script src="/src/client.ts" />
        {clientEntry === "admin" ? (
          <Script src="/src/admin-client.ts" />
        ) : null}
      </head>
      <body>
        <a class={styles.skipLink} href="#main-content">
          本文へ移動
        </a>
        <Header currentPath={currentPath} />
        <main
          class={styles.main}
          id="main-content"
          aria-label="Chanya.jp コンテンツ"
        >
          {children}
        </main>
        <Footer />
        <CommandPalette />
      </body>
    </html>
  );
};
