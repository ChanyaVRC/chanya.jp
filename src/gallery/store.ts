import {
  type GalleryDraftUpdate,
  type GalleryManifest,
  galleryManifestSchema,
  galleryPublishRequestSchema,
  parseGalleryManifest,
  seedGalleryManifest,
} from "./manifest";

const DRAFT_KEY = "manifests/draft.json";
const PUBLISHED_KEY = "manifests/published.json";
const STATE_KEY = "manifests/state.json";

interface StoredManifest {
  readonly manifest: GalleryManifest;
  readonly etag: string;
}

interface GalleryState {
  readonly schemaVersion: 1;
  readonly draft: GalleryManifest;
  readonly published: GalleryManifest;
}

interface StoredState {
  readonly state: GalleryState;
  readonly etag: string | null;
}

export class GalleryMutationReuseError extends Error {
  constructor() {
    super("A mutation id was reused with different content.");
    this.name = "GalleryMutationReuseError";
  }
}

export class GalleryStoreConflictError extends Error {
  readonly canonical: GalleryManifest;

  constructor(canonical: GalleryManifest) {
    super("The gallery manifest changed before this update was saved.");
    this.name = "GalleryStoreConflictError";
    this.canonical = canonical;
  }
}

function encodeManifest(manifest: GalleryManifest): string {
  return JSON.stringify(manifest);
}

function parseGalleryState(value: unknown): GalleryState {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("draft" in value) ||
    !("published" in value)
  ) {
    throw new TypeError("Gallery state is invalid.");
  }

  return {
    schemaVersion: 1,
    draft: parseGalleryManifest(value.draft),
    published: parseGalleryManifest(value.published),
  };
}

async function loadStoredManifest(
  bucket: R2Bucket | undefined,
  key: string,
): Promise<StoredManifest | null> {
  if (!bucket) {
    return null;
  }

  const object = await bucket.get(key);
  if (!object) {
    return null;
  }

  return {
    manifest: parseGalleryManifest(await object.json()),
    etag: object.etag,
  };
}

async function loadMutation(
  bucket: R2Bucket,
  channel: "draft" | "published",
  mutationId: string,
  requestHash: string,
): Promise<GalleryManifest | null> {
  const object = await bucket.get(`mutations/${channel}/${mutationId}.json`);
  if (!object) {
    return null;
  }

  const value: unknown = await object.json();
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Gallery mutation receipt is invalid.");
  }
  if (
    !("requestHash" in value) ||
    value.requestHash !== requestHash
  ) {
    throw new GalleryMutationReuseError();
  }
  if (!("manifest" in value)) {
    throw new TypeError("Gallery mutation receipt has no manifest.");
  }
  return galleryManifestSchema.parse(value.manifest);
}

async function requestHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function matchesLastMutation(
  manifest: GalleryManifest,
  channel: "draft" | "published",
  mutationId: string,
  hash: string,
): boolean {
  const last = manifest.lastMutation;
  if (!last || last.id !== mutationId || last.channel !== channel) {
    return false;
  }
  if (last.requestHash !== hash) {
    throw new GalleryMutationReuseError();
  }
  return true;
}

async function loadGalleryState(
  bucket: R2Bucket | undefined,
): Promise<StoredState> {
  const seed = seedGalleryManifest();
  if (!bucket) {
    return {
      state: { schemaVersion: 1, draft: seed, published: seed },
      etag: null,
    };
  }

  const object = await bucket.get(STATE_KEY);
  if (object) {
    return {
      state: parseGalleryState(await object.json()),
      etag: object.etag,
    };
  }

  const [legacyDraft, legacyPublished] = await Promise.all([
    loadStoredManifest(bucket, DRAFT_KEY),
    loadStoredManifest(bucket, PUBLISHED_KEY),
  ]);
  const published = legacyPublished?.manifest ?? seed;
  return {
    state: {
      schemaVersion: 1,
      draft: legacyDraft?.manifest ?? published,
      published,
    },
    etag: null,
  };
}

async function conditionallyPutState(
  bucket: R2Bucket,
  state: GalleryState,
  etag: string | null,
  conflictChannel: "draft" | "published",
): Promise<void> {
  const result = await bucket.put(STATE_KEY, JSON.stringify(state), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    onlyIf:
      etag === null
        ? { etagDoesNotMatch: "*" }
        : { etagMatches: etag },
  });

  if (!result) {
    const canonical = await loadGalleryState(bucket);
    throw new GalleryStoreConflictError(
      canonical.state[conflictChannel],
    );
  }
}

async function recordMutation(
  bucket: R2Bucket,
  channel: "draft" | "published",
  mutationId: string,
  manifest: GalleryManifest,
  requestHash: string,
): Promise<void> {
  const content = encodeManifest(manifest);
  const receipt = JSON.stringify({ requestHash, manifest });
  const metadata: R2PutOptions = {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  };

  await Promise.all([
    bucket.put(`mutations/${channel}/${mutationId}.json`, receipt, metadata),
    bucket.put(
      `revisions/${channel}/${String(manifest.version).padStart(8, "0")}-${mutationId}.json`,
      content,
      metadata,
    ),
  ]);
}

export function hasGalleryStore(
  bucket: R2Bucket | undefined,
): bucket is R2Bucket {
  return Boolean(bucket);
}

export async function loadDraftManifest(
  bucket: R2Bucket | undefined,
): Promise<GalleryManifest> {
  return (await loadGalleryState(bucket)).state.draft;
}

export async function loadPublishedManifest(
  bucket: R2Bucket | undefined,
): Promise<GalleryManifest> {
  return (await loadGalleryState(bucket)).state.published;
}

export async function saveDraftManifest(
  bucket: R2Bucket,
  update: GalleryDraftUpdate,
): Promise<GalleryManifest> {
  const hash = await requestHash({
    baseVersion: update.baseVersion,
    items: update.items,
  });
  const replay = await loadMutation(
    bucket,
    "draft",
    update.mutationId,
    hash,
  );
  if (replay) {
    return replay;
  }

  const current = await loadGalleryState(bucket);
  if (
    matchesLastMutation(
      current.state.draft,
      "draft",
      update.mutationId,
      hash,
    )
  ) {
    return current.state.draft;
  }
  if (current.state.draft.version !== update.baseVersion) {
    throw new GalleryStoreConflictError(current.state.draft);
  }

  const next = parseGalleryManifest({
    schemaVersion: 1,
    version: current.state.draft.version + 1,
    updatedAt: new Date().toISOString(),
    lastMutation: {
      id: update.mutationId,
      channel: "draft",
      requestHash: hash,
    },
    items: update.items,
  });

  await conditionallyPutState(
    bucket,
    { ...current.state, draft: next },
    current.etag,
    "draft",
  );
  try {
    await recordMutation(bucket, "draft", update.mutationId, next, hash);
  } catch (error) {
    console.error("Unable to record gallery draft revision", error);
  }
  return next;
}

export async function publishDraftManifest(
  bucket: R2Bucket,
  input: unknown,
): Promise<GalleryManifest> {
  const request = galleryPublishRequestSchema.parse(input);
  const hash = await requestHash({ baseVersion: request.baseVersion });
  const replay = await loadMutation(
    bucket,
    "published",
    request.mutationId,
    hash,
  );
  if (replay) {
    return replay;
  }

  const current = await loadGalleryState(bucket);
  if (
    matchesLastMutation(
      current.state.published,
      "published",
      request.mutationId,
      hash,
    )
  ) {
    return current.state.published;
  }
  if (current.state.draft.version !== request.baseVersion) {
    throw new GalleryStoreConflictError(current.state.draft);
  }

  const next = parseGalleryManifest({
    ...current.state.draft,
    updatedAt: new Date().toISOString(),
    lastMutation: {
      id: request.mutationId,
      channel: "published",
      requestHash: hash,
    },
  });
  await conditionallyPutState(
    bucket,
    { ...current.state, published: next },
    current.etag,
    "draft",
  );
  try {
    await recordMutation(
      bucket,
      "published",
      request.mutationId,
      next,
      hash,
    );
  } catch (error) {
    console.error("Unable to record gallery publish revision", error);
  }
  return next;
}
