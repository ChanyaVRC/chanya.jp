import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type JsonRecord = Record<string, unknown>;

const previewConfigPath = resolve("dist", "chanya_jp", "wrangler.json");

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
}

function assertEqual(
  label: string,
  actual: unknown,
  expected: string | boolean,
): void {
  if (actual !== expected) {
    throw new Error(
      `${label} must be ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
    );
  }
}

async function main(): Promise<void> {
  const source = await readFile(previewConfigPath, "utf8");
  const parsed: unknown = JSON.parse(source);
  const config = requireRecord(parsed, "Preview Wrangler config");

  assertEqual("name", config.name, "chanya-jp");
  assertEqual("topLevelName", config.topLevelName, "chanya-jp");
  assertEqual("targetEnvironment", config.targetEnvironment, "preview");
  assertEqual("preview_urls", config.preview_urls, true);
  assertEqual("workers_dev", config.workers_dev, false);

  const vars = requireRecord(config.vars, "vars");
  assertEqual(
    "vars.GALLERY_ENVIRONMENT",
    vars.GALLERY_ENVIRONMENT,
    "preview",
  );

  const galleryBindings = requireArray(
    config.r2_buckets,
    "r2_buckets",
  ).filter(
    (binding): binding is JsonRecord =>
      isRecord(binding) && binding.binding === "GALLERY_BUCKET",
  );
  const [galleryBinding] = galleryBindings;
  if (galleryBindings.length !== 1 || !galleryBinding) {
    throw new Error(
      `Expected exactly one GALLERY_BUCKET binding, received ${galleryBindings.length}.`,
    );
  }
  assertEqual(
    "GALLERY_BUCKET.bucket_name",
    galleryBinding.bucket_name,
    "chanya-gallery-preview",
  );

  console.log(
    "Preview config verified: chanya-jp uses chanya-gallery-preview with preview URLs enabled.",
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
