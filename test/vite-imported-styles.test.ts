import { describe, expect, it } from "vitest";
import {
  collectImportedStylesheetPaths,
  type ViteManifest,
} from "../src/components/ViteImportedStyles";

describe("production stylesheet manifest traversal", () => {
  it("collects and deduplicates CSS from static imported chunks", () => {
    const manifest: ViteManifest = {
      "src/client.ts": {
        file: "assets/client.js",
        css: ["assets/fonts.css"],
        imports: ["_shared.js"],
      },
      "src/admin-client.ts": {
        file: "assets/admin.js",
        imports: ["_shared.js", "_admin.js"],
      },
      "_shared.js": {
        file: "assets/shared.js",
        css: ["assets/site.css"],
        imports: ["_tokens.js"],
      },
      "_tokens.js": {
        file: "assets/tokens.js",
        css: ["assets/tokens.css"],
      },
      "_admin.js": {
        file: "assets/admin-shared.js",
        css: ["assets/admin.css"],
      },
    };

    expect(
      collectImportedStylesheetPaths(manifest, [
        "/src/client.ts",
        "/src/admin-client.ts",
      ]),
    ).toEqual([
      "assets/site.css",
      "assets/tokens.css",
      "assets/admin.css",
    ]);
  });

  it("does not duplicate CSS already emitted directly by the Script entry", () => {
    const manifest: ViteManifest = {
      "src/client.ts": {
        file: "assets/client.js",
        css: ["assets/client.css"],
      },
    };

    expect(
      collectImportedStylesheetPaths(manifest, ["/src/client.ts"]),
    ).toEqual([]);
  });
});
