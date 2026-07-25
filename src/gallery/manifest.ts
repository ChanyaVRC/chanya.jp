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

export const galleryManifestItemSchema = z.object({
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
  focalPoint: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  }),
  source: gallerySourceSchema,
});

export const galleryManifestSchema = z
  .object({
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
    items: z.array(galleryManifestItemSchema).min(1).max(500),
  })
  .superRefine((manifest, context) => {
    const itemIds = new Set<string>();
    for (const [index, item] of manifest.items.entries()) {
      if (itemIds.has(item.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate gallery item id: ${item.id}`,
          path: ["items", index, "id"],
        });
      }
      itemIds.add(item.id);
    }
  });

export const galleryDraftUpdateSchema = z.object({
  baseVersion: z.number().int().min(1),
  mutationId: z.uuid(),
  items: z.array(galleryManifestItemSchema).min(1).max(500),
});

export const galleryPublishRequestSchema = z.object({
  baseVersion: z.number().int().min(1),
  mutationId: z.uuid(),
});

export type GalleryLayout = z.infer<typeof galleryLayoutSchema>;
export type GalleryManifestItem = z.infer<typeof galleryManifestItemSchema>;
export type GalleryManifest = z.infer<typeof galleryManifestSchema>;
export type GalleryDraftUpdate = z.infer<typeof galleryDraftUpdateSchema>;

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
    schemaVersion: 1,
    version: 1,
    updatedAt: "2020-09-05T00:00:00.000Z",
    lastMutation: null,
    items: galleryItems.map((item, index) => ({
      ...item,
      layout: seedLayout(index),
      focalPoint: { x: 0.5, y: 0.5 },
      source: { kind: "static", id: item.id },
    })),
  });
}

export function parseGalleryManifest(value: unknown): GalleryManifest {
  return galleryManifestSchema.parse(value);
}
