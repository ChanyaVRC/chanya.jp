import { z } from "zod";
import { galleryItems } from "../data/gallery";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
  }, "Invalid calendar date");

export const galleryLayoutSchema = z.enum(["standard", "wide", "feature"]);

const gallerySourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("static"),
    id: z.string().regex(/^nankotsu-\d{2}$/u),
  }),
  z.object({
    kind: z.literal("managed"),
    key: z.uuid(),
  }),
]);

const galleryManifestItemBaseSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^(?:nankotsu-\d{2}|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/iu),
  title: z.string().trim().min(1).max(120),
  date: isoDateSchema.nullable(),
  alt: z.string().trim().min(1).max(300),
  width: z.number().int().min(1).max(16_384),
  height: z.number().int().min(1).max(16_384),
  layout: galleryLayoutSchema,
  layoutLocked: z.boolean().default(false),
  focalPoint: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  source: gallerySourceSchema,
});

export const gallerySectionSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).default(""),
});

export const galleryManifestItemSchema = galleryManifestItemBaseSchema.extend({
  sectionId: z.uuid(),
});

const gallerySectionsSchema = z.array(gallerySectionSchema).min(1).max(50);
const galleryItemsSchema = z.array(galleryManifestItemSchema).min(1).max(500);

interface GalleryContent {
  readonly sections: readonly z.infer<typeof gallerySectionSchema>[];
  readonly items: readonly z.infer<typeof galleryManifestItemSchema>[];
}

function validateGalleryContent(
  content: GalleryContent,
  context: z.RefinementCtx,
): void {
  const sectionIds = new Set<string>();
  for (const [index, section] of content.sections.entries()) {
    if (sectionIds.has(section.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate gallery section id: ${section.id}`,
        path: ["sections", index, "id"],
      });
    }
    sectionIds.add(section.id);
  }

  const itemIds = new Set<string>();
  for (const [index, item] of content.items.entries()) {
    if (itemIds.has(item.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate gallery item id: ${item.id}`,
        path: ["items", index, "id"],
      });
    }
    if (!sectionIds.has(item.sectionId)) {
      context.addIssue({
        code: "custom",
        message: `Unknown gallery section id: ${item.sectionId}`,
        path: ["items", index, "sectionId"],
      });
    }
    itemIds.add(item.id);
  }
}

function normalizeGalleryItems(
  content: GalleryContent,
): Array<z.infer<typeof galleryManifestItemSchema>> {
  return content.sections.flatMap((section) =>
    content.items.filter((item) => item.sectionId === section.id),
  );
}

export const galleryManifestSchema = z
  .object({
    schemaVersion: z.literal(2),
    version: z.number().int().min(1),
    updatedAt: z.iso.datetime({ offset: true }),
    lastMutation: z
      .object({
        id: z.uuid(),
        channel: z.enum(["draft", "published"]),
        requestHash: z.string().regex(/^[0-9a-f]{64}$/u),
      })
      .nullable()
      .default(null),
    sections: gallerySectionsSchema,
    items: galleryItemsSchema,
  })
  .superRefine(validateGalleryContent)
  .transform((manifest) => ({
    ...manifest,
    items: normalizeGalleryItems(manifest),
  }));

export const galleryDraftUpdateSchema = z
  .object({
    baseVersion: z.number().int().min(1),
    mutationId: z.uuid(),
    sections: gallerySectionsSchema,
    items: galleryItemsSchema,
  })
  .superRefine(validateGalleryContent)
  .transform((update) => ({
    ...update,
    items: normalizeGalleryItems(update),
  }));

export const galleryPublishRequestSchema = z.object({
  baseVersion: z.number().int().min(1),
  mutationId: z.uuid(),
});

export type GalleryLayout = z.infer<typeof galleryLayoutSchema>;
export type GallerySection = z.infer<typeof gallerySectionSchema>;
export type GalleryManifestItem = z.infer<typeof galleryManifestItemSchema>;
export type GalleryManifest = z.infer<typeof galleryManifestSchema>;
export type GalleryDraftUpdate = z.infer<typeof galleryDraftUpdateSchema>;

export const defaultGallerySectionId =
  "00000000-0000-4000-8000-000000000000";

const legacyGalleryManifestSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.number().int().min(1),
  updatedAt: z.iso.datetime({ offset: true }),
  lastMutation: z
    .object({
      id: z.uuid(),
      channel: z.enum(["draft", "published"]),
      requestHash: z.string().regex(/^[0-9a-f]{64}$/u),
    })
    .nullable()
    .default(null),
  items: z.array(galleryManifestItemBaseSchema).min(1).max(500),
});

const featureIndexes = new Set([0, 12, 27]);
const wideIndexes = new Set([3, 8, 14, 21, 28, 35, 40]);

function seedLayout(index: number): GalleryLayout {
  if (featureIndexes.has(index)) {
    return "feature";
  }

  return wideIndexes.has(index) ? "wide" : "standard";
}

export function seedGalleryManifest(): GalleryManifest {
  return galleryManifestSchema.parse({
    schemaVersion: 2,
    version: 1,
    updatedAt: "2020-09-05T00:00:00.000Z",
    lastMutation: null,
    sections: [
      {
        id: defaultGallerySectionId,
        title: "Nankotsu",
        description: "VRChatで撮影した時間と場所の記録。",
      },
    ],
    items: galleryItems.map((item, index) => ({
      ...item,
      sectionId: defaultGallerySectionId,
      layout: seedLayout(index),
      layoutLocked: false,
      focalPoint: { x: 0.5, y: 0.5 },
      source: { kind: "static", id: item.id },
    })),
  });
}

export function parseGalleryManifest(value: unknown): GalleryManifest {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion === 1
  ) {
    const legacy = legacyGalleryManifestSchema.parse(value);
    return galleryManifestSchema.parse({
      ...legacy,
      schemaVersion: 2,
      sections: [
        {
          id: defaultGallerySectionId,
          title: "Nankotsu",
          description: "VRChatで撮影した時間と場所の記録。",
        },
      ],
      items: legacy.items.map((item) => ({
        ...item,
        sectionId: defaultGallerySectionId,
      })),
    });
  }

  return galleryManifestSchema.parse(value);
}
