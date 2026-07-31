import { cloudflare } from "@cloudflare/vite-plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";

const vanillaExtractPlugins = vanillaExtractPlugin();
const productionBranch = "main";

function selectCloudflareEnvironment(mode: string): void {
  // Workers Builds exposes the pushed branch before Vite resolves the
  // flattened deployment config. Keep branch previews on their isolated R2.
  const isWorkersPreviewBuild =
    process.env.WORKERS_CI === "1" &&
    typeof process.env.WORKERS_CI_BRANCH === "string" &&
    process.env.WORKERS_CI_BRANCH !== productionBranch;
  const environment =
    process.env.CLOUDFLARE_ENV ??
    (mode === "preview" || isWorkersPreviewBuild ? "preview" : undefined);

  if (environment) {
    process.env.CLOUDFLARE_ENV = environment;
  }
}

// Vanilla Extract's legacy `ssr.external` config creates an unused generic
// `ssr` environment in Vite 8. Cloudflare already supplies the real Worker
// environment, and the extra environment makes multi-environment builds try
// to use an HTML entry as SSR input. The transform plugin itself is retained.
for (const plugin of vanillaExtractPlugins) {
  if (
    plugin.name === "vite-plugin-vanilla-extract" &&
    typeof plugin.config === "function"
  ) {
    const configureVanillaExtract = plugin.config;
    plugin.config = function configureWithoutLegacySsr(
      config,
      environment,
    ) {
      configureVanillaExtract.call(this, config, environment);
      return {};
    };
  }
}

export default defineConfig(({ mode }) => {
  selectCloudflareEnvironment(mode);

  return {
    build: {
      // Keep every font as a first-party Static Asset so the production CSP can
      // remain `font-src 'self'` without data: fallbacks.
      assetsInlineLimit: 0,
    },
    plugins: [cloudflare(), ssrPlugin(), ...vanillaExtractPlugins],
  };
});
