import { cloudflare } from "@cloudflare/vite-plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";

const vanillaExtractPlugins = vanillaExtractPlugin();

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

export default defineConfig({
  plugins: [cloudflare(), ssrPlugin(), ...vanillaExtractPlugins],
});
