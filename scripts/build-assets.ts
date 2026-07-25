import { lstat, mkdir, readdir, realpath, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import sharp from "sharp";
import type { OutputInfo } from "sharp";

const EXPECTED_GALLERY_COUNT = 42;
const GALLERY_WIDTHS = [640, 1280] as const;
const OUTPUT_FORMATS = ["avif", "webp"] as const;

function assertDescendant(root: string, target: string, label: string): void {
  const relationship = relative(root, target);

  if (
    relationship === "" ||
    relationship === ".." ||
    relationship.startsWith(`..${sep}`) ||
    isAbsolute(relationship)
  ) {
    throw new Error(`${label} must be inside ${root}; received ${target}`);
  }
}

async function requireDirectory(
  projectRoot: string,
  directory: string,
  label: string,
): Promise<string> {
  const info = await lstat(directory);

  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error(`${label} must be a real directory: ${directory}`);
  }

  const canonicalDirectory = await realpath(directory);
  assertDescendant(projectRoot, canonicalDirectory, label);
  return canonicalDirectory;
}

async function requireRegularFile(
  allowedRoot: string,
  file: string,
  label: string,
): Promise<string> {
  const info = await lstat(file);

  if (info.isSymbolicLink() || !info.isFile()) {
    throw new Error(`${label} must be a regular file: ${file}`);
  }

  const canonicalFile = await realpath(file);
  assertDescendant(allowedRoot, canonicalFile, label);
  return canonicalFile;
}

async function prepareOutputDirectory(
  projectRoot: string,
  publicDirectory: string,
): Promise<string> {
  const outputDirectory = resolve(publicDirectory, "media");
  assertDescendant(projectRoot, outputDirectory, "Generated media directory");
  assertDescendant(publicDirectory, outputDirectory, "Generated media directory");

  try {
    const outputInfo = await lstat(outputDirectory);

    if (outputInfo.isSymbolicLink() || !outputInfo.isDirectory()) {
      throw new Error(
        `Generated media path must be a real directory: ${outputDirectory}`,
      );
    }

    const canonicalOutput = await realpath(outputDirectory);
    assertDescendant(projectRoot, canonicalOutput, "Generated media directory");
    assertDescendant(publicDirectory, canonicalOutput, "Generated media directory");
  } catch (error: unknown) {
    if (
      !(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      )
    ) {
      throw error;
    }
  }

  await rm(outputDirectory, { force: true, recursive: true });
  await Promise.all([
    mkdir(resolve(outputDirectory, "profile"), { recursive: true }),
    mkdir(resolve(outputDirectory, "gallery"), { recursive: true }),
  ]);

  return outputDirectory;
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = (await readdir(directory, { withFileTypes: true })).sort(
    (left, right) => left.name.localeCompare(right.name, "en"),
  );
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    } else {
      throw new Error(`Generated media contains an unsupported entry: ${entryPath}`);
    }
  }

  return files;
}

function expectedGalleryNames(): string[] {
  return Array.from(
    { length: EXPECTED_GALLERY_COUNT },
    (_, index) => `nankotsu-${String(index + 1).padStart(2, "0")}.webp`,
  );
}

async function buildProfile(input: string, outputDirectory: string): Promise<void> {
  const profileDirectory = resolve(outputDirectory, "profile");
  const image = sharp(input).rotate().resize({
    width: 400,
    height: 400,
    fit: "cover",
    withoutEnlargement: true,
  });

  await Promise.all([
    image
      .clone()
      .avif({ effort: 5, quality: 64 })
      .toFile(resolve(profileDirectory, "profile-400.avif")),
    image
      .clone()
      .webp({ effort: 5, quality: 80 })
      .toFile(resolve(profileDirectory, "profile-400.webp")),
  ]);
}

async function buildGalleryImage(
  input: string,
  id: string,
  outputDirectory: string,
): Promise<void> {
  const galleryDirectory = resolve(outputDirectory, "gallery");
  const image = sharp(input).rotate();
  const writes: Promise<OutputInfo>[] = [];

  for (const width of GALLERY_WIDTHS) {
    const resized = image.clone().resize({
      width,
      fit: "inside",
      withoutEnlargement: true,
    });

    writes.push(
      resized
        .clone()
        .avif({ effort: 5, quality: 64 })
        .toFile(resolve(galleryDirectory, `${id}-${width}.avif`)),
      resized
        .clone()
        .webp({ effort: 5, quality: 80 })
        .toFile(resolve(galleryDirectory, `${id}-${width}.webp`)),
    );
  }

  await Promise.all(writes);
}

async function main(): Promise<void> {
  const projectRoot = await realpath(process.cwd());
  const mediaSourceDirectory = await requireDirectory(
    projectRoot,
    resolve(projectRoot, "media-src"),
    "Media source directory",
  );
  const gallerySourceDirectory = await requireDirectory(
    mediaSourceDirectory,
    resolve(mediaSourceDirectory, "gallery"),
    "Gallery source directory",
  );
  const publicDirectory = await requireDirectory(
    projectRoot,
    resolve(projectRoot, "public"),
    "Public directory",
  );
  const profileInput = await requireRegularFile(
    mediaSourceDirectory,
    resolve(mediaSourceDirectory, "profile.jpg"),
    "Profile source",
  );

  const galleryEntries = await readdir(gallerySourceDirectory, {
    withFileTypes: true,
  });
  const unsupportedEntries = galleryEntries.filter(
    (entry) => !entry.isFile() || !/^nankotsu-\d{2}\.webp$/u.test(entry.name),
  );

  if (unsupportedEntries.length > 0) {
    throw new Error(
      `Gallery source contains unexpected entries: ${unsupportedEntries
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right, "en"))
        .join(", ")}`,
    );
  }

  const galleryNames = galleryEntries
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en"));
  const expectedNames = expectedGalleryNames();

  if (
    galleryNames.length !== EXPECTED_GALLERY_COUNT ||
    galleryNames.some((name, index) => name !== expectedNames[index])
  ) {
    throw new Error(
      `Expected exactly nankotsu-01.webp through nankotsu-42.webp; found ${galleryNames.length} gallery sources`,
    );
  }

  const galleryInputs = await Promise.all(
    galleryNames.map(async (name) => ({
      id: name.replace(/\.webp$/u, ""),
      path: await requireRegularFile(
        gallerySourceDirectory,
        resolve(gallerySourceDirectory, name),
        `Gallery source ${name}`,
      ),
    })),
  );
  const outputDirectory = await prepareOutputDirectory(
    projectRoot,
    publicDirectory,
  );

  console.log(`Optimizing 1 profile and ${galleryInputs.length} gallery images…`);
  await buildProfile(profileInput, outputDirectory);

  for (const input of galleryInputs) {
    await buildGalleryImage(input.path, input.id, outputDirectory);
  }

  const generatedFiles = await listFiles(outputDirectory);
  const expectedOutputCount =
    2 +
    EXPECTED_GALLERY_COUNT * GALLERY_WIDTHS.length * OUTPUT_FORMATS.length;

  if (generatedFiles.length !== expectedOutputCount) {
    throw new Error(
      `Expected ${expectedOutputCount} generated assets; found ${generatedFiles.length}`,
    );
  }

  console.log(
    `Generated ${generatedFiles.length} assets in public/media (${galleryInputs.length} gallery sources × 4 + 2 profile).`,
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
