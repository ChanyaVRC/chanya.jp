import { describe, expect, it } from "vitest";
import {
  type GalleryManifest,
  galleryManifestSchema,
  seedGalleryManifest,
} from "../src/gallery/manifest";
import {
  GalleryMutationReuseError,
  GalleryStoreConflictError,
  loadDraftManifest,
  loadPublishedManifest,
  publishDraftManifest,
  saveDraftManifest,
} from "../src/gallery/store";

const STATE_KEY = "manifests/state.json";
const LEGACY_DRAFT_KEY = "manifests/draft.json";
const LEGACY_PUBLISHED_KEY = "manifests/published.json";

const MUTATION_IDS = {
  firstDraft: "00000000-0000-4000-8000-000000000001",
  secondDraft: "00000000-0000-4000-8000-000000000002",
  publish: "00000000-0000-4000-8000-000000000003",
  reused: "00000000-0000-4000-8000-000000000004",
  conflict: "00000000-0000-4000-8000-000000000005",
} as const;

interface GalleryState {
  readonly schemaVersion: 1;
  readonly draft: GalleryManifest;
  readonly published: GalleryManifest;
}

interface StoredValue {
  readonly body: string;
  readonly etag: string;
}

interface StatePutCondition {
  readonly etagMatches: string | undefined;
  readonly etagDoesNotMatch: string | undefined;
}

type R2PutValue =
  | ReadableStream
  | ArrayBuffer
  | ArrayBufferView
  | string
  | null
  | Blob;

class MemoryR2Object implements R2ObjectBody {
  readonly version: string;
  readonly size: number;
  readonly httpEtag: string;
  readonly checksums: R2Checksums = {
    toJSON: () => ({}),
  };
  readonly uploaded = new Date("2026-01-01T00:00:00.000Z");
  readonly storageClass = "Standard";

  constructor(
    readonly key: string,
    private readonly value: string,
    readonly etag: string,
  ) {
    this.version = etag;
    this.size = new TextEncoder().encode(value).byteLength;
    this.httpEtag = `"${etag}"`;
  }

  get body(): ReadableStream {
    return new Blob([this.value]).stream();
  }

  get bodyUsed(): boolean {
    return false;
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return new Blob([this.value]).arrayBuffer();
  }

  bytes(): Promise<Uint8Array> {
    return Promise.resolve(new TextEncoder().encode(this.value));
  }

  text(): Promise<string> {
    return Promise.resolve(this.value);
  }

  json<T>(): Promise<T> {
    return Promise.resolve(JSON.parse(this.value) as T);
  }

  blob(): Promise<Blob> {
    return Promise.resolve(
      new Blob([this.value], { type: "application/json" }),
    );
  }

  writeHttpMetadata(_headers: Headers): void {}
}

class MemoryR2Bucket implements R2Bucket {
  private readonly objects = new Map<string, StoredValue>();
  private etagSequence = 0;
  private pendingStateConflict: GalleryState | undefined;

  readonly statePutConditions: StatePutCondition[] = [];

  seedJson(key: string, value: unknown): void {
    this.write(key, JSON.stringify(value));
  }

  readJson<T>(key: string): T {
    const stored = this.objects.get(key);
    if (!stored) {
      throw new Error(`Missing in-memory R2 object: ${key}`);
    }
    return JSON.parse(stored.body) as T;
  }

  has(key: string): boolean {
    return this.objects.has(key);
  }

  conflictNextStatePutWith(state: GalleryState): void {
    this.pendingStateConflict = state;
  }

  async head(key: string): Promise<R2Object | null> {
    const stored = this.objects.get(key);
    return stored ? new MemoryR2Object(key, stored.body, stored.etag) : null;
  }

  get(
    key: string,
    options: R2GetOptions & { onlyIf: R2Conditional | Headers },
  ): Promise<R2ObjectBody | R2Object | null>;
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null>;
  async get(
    key: string,
    _options?: R2GetOptions,
  ): Promise<R2ObjectBody | R2Object | null> {
    const stored = this.objects.get(key);
    return stored ? new MemoryR2Object(key, stored.body, stored.etag) : null;
  }

  put(
    key: string,
    value: R2PutValue,
    options: R2PutOptions & { onlyIf: R2Conditional | Headers },
  ): Promise<R2Object | null>;
  put(
    key: string,
    value: R2PutValue,
    options?: R2PutOptions,
  ): Promise<R2Object>;
  async put(
    key: string,
    value: R2PutValue,
    options?: R2PutOptions,
  ): Promise<R2Object | null> {
    if (typeof value !== "string") {
      throw new TypeError("MemoryR2Bucket only accepts string values.");
    }

    const onlyIf =
      options?.onlyIf && !(options.onlyIf instanceof Headers)
        ? options.onlyIf
        : undefined;

    if (key === STATE_KEY) {
      this.statePutConditions.push({
        etagMatches: onlyIf?.etagMatches,
        etagDoesNotMatch: onlyIf?.etagDoesNotMatch,
      });

      if (this.pendingStateConflict) {
        const competingState = this.pendingStateConflict;
        this.pendingStateConflict = undefined;
        this.write(key, JSON.stringify(competingState));
      }
    }

    const stored = this.objects.get(key);
    if (
      onlyIf?.etagMatches !== undefined &&
      stored?.etag !== onlyIf.etagMatches
    ) {
      return null;
    }
    if (
      onlyIf?.etagDoesNotMatch !== undefined &&
      (onlyIf.etagDoesNotMatch === "*"
        ? stored !== undefined
        : stored?.etag === onlyIf.etagDoesNotMatch)
    ) {
      return null;
    }

    return this.write(key, value);
  }

  async delete(keys: string | string[]): Promise<void> {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.objects.delete(key);
    }
  }

  async list(_options?: R2ListOptions): Promise<never> {
    throw new Error("MemoryR2Bucket.list is not implemented.");
  }

  async createMultipartUpload(
    _key: string,
    _options?: R2MultipartOptions,
  ): Promise<never> {
    throw new Error(
      "MemoryR2Bucket.createMultipartUpload is not implemented.",
    );
  }

  resumeMultipartUpload(
    _key: string,
    _uploadId: string,
  ): R2MultipartUpload {
    throw new Error(
      "MemoryR2Bucket.resumeMultipartUpload is not implemented.",
    );
  }

  private write(key: string, body: string): MemoryR2Object {
    this.etagSequence += 1;
    const stored = {
      body,
      etag: `etag-${this.etagSequence}`,
    };
    this.objects.set(key, stored);
    return new MemoryR2Object(key, stored.body, stored.etag);
  }
}

function manifest(version: number, title: string): GalleryManifest {
  const seed = seedGalleryManifest();
  const first = seed.items[0];
  if (!first) {
    throw new Error("The seed gallery must contain an item.");
  }

  return galleryManifestSchema.parse({
    ...seed,
    version,
    updatedAt: "2026-07-25T00:00:00.000Z",
    lastMutation: null,
    items: [{ ...first, title }],
  });
}

function itemsWithTitle(title: string): GalleryManifest["items"] {
  return manifest(1, title).items;
}

describe("gallery R2 store", () => {
  it("R2が空ならseedをdraftとpublishedの両方へfallbackする", async () => {
    const bucket = new MemoryR2Bucket();
    const seed = seedGalleryManifest();

    await expect(loadDraftManifest(bucket)).resolves.toEqual(seed);
    await expect(loadPublishedManifest(bucket)).resolves.toEqual(seed);
    expect(bucket.has(STATE_KEY)).toBe(false);
  });

  it("legacy publishedだけがあればdraftも同じmanifestへfallbackする", async () => {
    const bucket = new MemoryR2Bucket();
    const legacyPublished = manifest(7, "Legacy published");
    bucket.seedJson(LEGACY_PUBLISHED_KEY, legacyPublished);

    await expect(loadPublishedManifest(bucket)).resolves.toEqual(
      legacyPublished,
    );
    await expect(loadDraftManifest(bucket)).resolves.toEqual(
      legacyPublished,
    );
    expect(bucket.has(LEGACY_DRAFT_KEY)).toBe(false);
  });

  it("draft保存はversionを進め、state作成と更新をetag CASする", async () => {
    const bucket = new MemoryR2Bucket();

    const first = await saveDraftManifest(bucket, {
      baseVersion: 1,
      mutationId: MUTATION_IDS.firstDraft,
      items: itemsWithTitle("First draft"),
    });
    const second = await saveDraftManifest(bucket, {
      baseVersion: first.version,
      mutationId: MUTATION_IDS.secondDraft,
      items: itemsWithTitle("Second draft"),
    });
    const state = bucket.readJson<GalleryState>(STATE_KEY);

    expect(first.version).toBe(2);
    expect(second.version).toBe(3);
    expect(state.draft).toEqual(second);
    expect(state.published).toEqual(seedGalleryManifest());
    expect(bucket.statePutConditions).toEqual([
      {
        etagMatches: undefined,
        etagDoesNotMatch: "*",
      },
      {
        etagMatches: "etag-1",
        etagDoesNotMatch: undefined,
      },
    ]);
  });

  it("publishは同じstate内のdraftを保ちpublishedへ反映する", async () => {
    const bucket = new MemoryR2Bucket();
    const draft = await saveDraftManifest(bucket, {
      baseVersion: 1,
      mutationId: MUTATION_IDS.firstDraft,
      items: itemsWithTitle("Ready to publish"),
    });

    const published = await publishDraftManifest(bucket, {
      baseVersion: draft.version,
      mutationId: MUTATION_IDS.publish,
    });
    const state = bucket.readJson<GalleryState>(STATE_KEY);

    expect(state.draft).toEqual(draft);
    expect(state.published).toEqual(published);
    expect(state.published.items).toEqual(state.draft.items);
    expect(state.published.version).toBe(state.draft.version);
    expect(state.draft.lastMutation?.channel).toBe("draft");
    expect(state.published.lastMutation?.channel).toBe("published");
    expect(bucket.has(LEGACY_DRAFT_KEY)).toBe(false);
    expect(bucket.has(LEGACY_PUBLISHED_KEY)).toBe(false);
  });

  it("同じmutation idを異なるrequest hashで再利用すると拒否する", async () => {
    const bucket = new MemoryR2Bucket();

    await saveDraftManifest(bucket, {
      baseVersion: 1,
      mutationId: MUTATION_IDS.reused,
      items: itemsWithTitle("Original mutation"),
    });

    await expect(
      saveDraftManifest(bucket, {
        baseVersion: 1,
        mutationId: MUTATION_IDS.reused,
        items: itemsWithTitle("Reused mutation"),
      }),
    ).rejects.toBeInstanceOf(GalleryMutationReuseError);
  });

  it("CAS競合時は再読込したcanonical draftを返す", async () => {
    const bucket = new MemoryR2Bucket();
    const currentDraft = await saveDraftManifest(bucket, {
      baseVersion: 1,
      mutationId: MUTATION_IDS.firstDraft,
      items: itemsWithTitle("Current draft"),
    });
    const currentState = bucket.readJson<GalleryState>(STATE_KEY);
    const competingDraft = manifest(3, "Competing draft");
    bucket.conflictNextStatePutWith({
      ...currentState,
      draft: competingDraft,
    });

    const saving = saveDraftManifest(bucket, {
      baseVersion: currentDraft.version,
      mutationId: MUTATION_IDS.conflict,
      items: itemsWithTitle("Losing draft"),
    });

    await expect(saving).rejects.toBeInstanceOf(
      GalleryStoreConflictError,
    );
    await expect(saving).rejects.toMatchObject({
      canonical: competingDraft,
    });
    await expect(loadDraftManifest(bucket)).resolves.toEqual(
      competingDraft,
    );
  });
});
