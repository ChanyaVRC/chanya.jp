import type { FC } from "hono/jsx";

export interface ViteManifestChunk {
  readonly file: string;
  readonly css?: readonly string[];
  readonly imports?: readonly string[];
}

export type ViteManifest = Readonly<Record<string, ViteManifestChunk>>;

interface InjectedManifestModule {
  readonly default: ViteManifest;
}

type InjectedManifestModules = Readonly<
  Record<string, InjectedManifestModule>
>;

const injectedManifestModules =
  "__VITE_MANIFEST_CONTENT__" as unknown as InjectedManifestModules;

function loadClientManifest(): ViteManifest {
  if (typeof injectedManifestModules === "string") {
    return {};
  }

  return Object.values(injectedManifestModules).reduce<ViteManifest>(
    (manifest, module) => ({ ...manifest, ...module.default }),
    {},
  );
}

export function collectImportedStylesheetPaths(
  manifest: ViteManifest,
  entries: readonly string[],
): readonly string[] {
  const stylesheets = new Set<string>();
  const visited = new Set<string>();

  const visit = (key: string, includeOwnStyles: boolean): void => {
    if (visited.has(key)) {
      return;
    }
    visited.add(key);

    const chunk = manifest[key];
    if (!chunk) {
      return;
    }

    if (includeOwnStyles) {
      chunk.css?.forEach((stylesheet) => stylesheets.add(stylesheet));
    }
    chunk.imports?.forEach((dependency) => visit(dependency, true));
  };

  entries.forEach((entry) => visit(entry.replace(/^\//u, ""), false));
  return [...stylesheets];
}

export const ViteImportedStyles: FC<{
  readonly entries: readonly string[];
}> = ({ entries }) => {
  if (!import.meta.env.PROD) {
    return null;
  }

  const stylesheets = collectImportedStylesheetPaths(
    loadClientManifest(),
    entries,
  );

  return (
    <>
      {stylesheets.map((stylesheet) => (
        <link rel="stylesheet" href={`/${stylesheet}`} />
      ))}
    </>
  );
};
