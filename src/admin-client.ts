import {
  galleryManifestSchema,
  type GalleryManifest,
  type GalleryManifestItem,
  type GallerySection,
} from "./gallery/manifest";
import * as styles from "./styles/site.css";

interface AdminBootstrap {
  readonly manifest: GalleryManifest;
  readonly actor: string;
  readonly csrfToken: string;
}

interface AssetUploadResponse {
  readonly key: string;
  readonly width: number;
  readonly height: number;
}

function requiredElement<T extends Element>(
  scope: ParentNode,
  selector: string,
  guard: (element: Element) => element is T,
): T {
  const element = scope.querySelector(selector);
  if (!element || !guard(element)) {
    throw new Error(`Required gallery admin element is missing: ${selector}`);
  }
  return element;
}

const root = requiredElement(
  document,
  "[data-gallery-admin]",
  (element): element is HTMLElement => element instanceof HTMLElement,
);
const bootstrapElement = requiredElement(
  document,
  "[data-gallery-bootstrap]",
  (element): element is HTMLScriptElement =>
    element instanceof HTMLScriptElement,
);

function parseBootstrap(source: string): AdminBootstrap {
  const value: unknown = JSON.parse(source);
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Gallery admin bootstrap is invalid.");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.actor !== "string" || typeof record.csrfToken !== "string") {
    throw new TypeError("Gallery admin identity is invalid.");
  }

  return {
    manifest: galleryManifestSchema.parse(record.manifest),
    actor: record.actor,
    csrfToken: record.csrfToken,
  };
}

const bootstrap = parseBootstrap(bootstrapElement.textContent ?? "");
const isHtmlElement = (element: Element): element is HTMLElement =>
  element instanceof HTMLElement;
const isButton = (element: Element): element is HTMLButtonElement =>
  element instanceof HTMLButtonElement;
const canvas = requiredElement(root, "[data-gallery-canvas]", isHtmlElement);
const inspector = requiredElement(
  root,
  "[data-gallery-inspector]",
  isHtmlElement,
);
const status = requiredElement(root, "[data-gallery-status]", isHtmlElement);
const toast = requiredElement(root, "[data-gallery-toast]", isHtmlElement);
const undoButton = requiredElement(root, "[data-gallery-undo]", isButton);
const previewButton = requiredElement(root, "[data-gallery-preview]", isButton);
const saveButton = requiredElement(root, "[data-gallery-save]", isButton);
const publishButton = requiredElement(root, "[data-gallery-publish]", isButton);
const importButton = requiredElement(root, "[data-gallery-import]", isButton);
const addSectionButton = requiredElement(root, "[data-section-add]", isButton);
const autoLayoutButton = requiredElement(
  root,
  "[data-gallery-auto-layout]",
  isButton,
);
const autoLayoutPreviewBar = requiredElement(
  root,
  "[data-gallery-auto-layout-preview]",
  isHtmlElement,
);
const autoLayoutSummary = requiredElement(
  root,
  "[data-auto-layout-summary]",
  isHtmlElement,
);
const autoLayoutNextButton = requiredElement(
  root,
  "[data-auto-layout-next]",
  isButton,
);
const autoLayoutAcceptButton = requiredElement(
  root,
  "[data-auto-layout-accept]",
  isButton,
);
const autoLayoutCancelButton = requiredElement(
  root,
  "[data-auto-layout-cancel]",
  isButton,
);
const folderInput = requiredElement(
  root,
  "[data-gallery-folder-input]",
  (element): element is HTMLInputElement => element instanceof HTMLInputElement,
);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const localPreviews = new Map<string, string>();
const dragStatus = document.createElement("p");
dragStatus.className = styles.srOnly;
dragStatus.dataset.galleryDragStatus = "";
dragStatus.setAttribute("role", "status");
dragStatus.setAttribute("aria-live", "polite");
dragStatus.setAttribute("aria-atomic", "true");
root.append(dragStatus);

interface GalleryContent {
  readonly sections: GallerySection[];
  readonly items: GalleryManifestItem[];
}

interface AutoLayoutPreview {
  readonly baseline: GalleryContent;
  readonly candidates: readonly GalleryContent[];
  readonly candidateIndex: number;
  readonly changedCount: number;
}

type EditorSelection =
  | { readonly kind: "item"; readonly id: string }
  | { readonly kind: "section"; readonly id: string };

type DropPosition = "before" | "after";
type ItemDropAxis = "block" | "inline";

interface DragPoint {
  readonly x: number;
  readonly y: number;
}

interface ItemPlacement {
  readonly beforeId: string | null;
  readonly markerAxis: ItemDropAxis;
}

type DragState =
  | {
      readonly kind: "item";
      readonly id: string;
      readonly snapshot: GalleryContent;
    }
  | {
      readonly kind: "section";
      readonly id: string;
      readonly snapshot: GalleryContent;
    };

type DragIntent =
  | {
      readonly kind: "item";
      readonly targetSectionId: string;
      readonly beforeId: string | null;
      readonly markerAxis: ItemDropAxis;
      readonly label: string;
      readonly slotLabel: string;
    }
  | {
      readonly kind: "section";
      readonly beforeId: string | null;
      readonly label: string;
      readonly slotLabel: string;
    };

const undoStack: GalleryContent[] = [];
let manifest = structuredClone(bootstrap.manifest);
let confirmedManifest = structuredClone(bootstrap.manifest);
let selection: EditorSelection | null = null;
let previewOnly = false;
let importInProgress = false;
let saveTimer: number | null = null;
let saveQueue: Promise<boolean> | null = null;
let saveAgain = false;
let saveInProgress = false;
let toastTimer: number | null = null;
let inspectorEditStart: GalleryContent | null = null;
let dragState: DragState | null = null;
let dragIntent: DragIntent | null = null;
let acceptedDragPoint: DragPoint | null = null;
let dragGhost: HTMLElement | null = null;
let dragLabelVisibilityTimer: number | null = null;
let autoLayoutPreview: AutoLayoutPreview | null = null;

function contentFingerprint(content: GalleryContent): string {
  return JSON.stringify({
    sections: content.sections,
    items: content.items,
  });
}

function cloneItems(items = manifest.items): GalleryManifestItem[] {
  return structuredClone(items);
}

function cloneContent(
  content: Pick<GalleryManifest, "sections" | "items"> = manifest,
): GalleryContent {
  return {
    sections: structuredClone(content.sections),
    items: structuredClone(content.items),
  };
}

function isAutoLayoutPreviewing(): boolean {
  return autoLayoutPreview !== null;
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function automaticItemOrder(
  items: readonly GalleryManifestItem[],
  variant: number,
): GalleryManifestItem[] {
  return [...items].toSorted((left, right) => {
    const leftDate = left.date ?? "";
    const rightDate = right.date ?? "";
    if (variant === 0 && leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }
    if (variant === 1 && leftDate !== rightDate) {
      return rightDate.localeCompare(leftDate);
    }
    if (variant === 2) {
      const aspectDifference =
        left.width / left.height - right.width / right.height;
      if (aspectDifference !== 0) {
        return aspectDifference > 0 ? -1 : 1;
      }
    }
    return stableHash(`${left.id}:${String(variant)}`) - stableHash(`${right.id}:${String(variant)}`);
  });
}

function automaticLayoutFor(
  item: GalleryManifestItem,
  index: number,
  itemCount: number,
  variant: number,
): GalleryManifestItem["layout"] {
  const aspect = item.width / item.height;
  const featurePeriod = [11, 9, 13][variant] ?? 11;
  const widePeriod = [5, 4, 6][variant] ?? 5;
  const offset = stableHash(`${item.id}:${String(variant)}`) % 3;
  if (
    itemCount >= 7 &&
    aspect >= 1.1 &&
    (index + offset) % featurePeriod === 0
  ) {
    return "feature";
  }
  if (aspect >= 1.28 && (index + offset) % widePeriod === 0) {
    return "wide";
  }
  return "standard";
}

function automaticLayoutCandidate(
  baseline: GalleryContent,
  variant: number,
): GalleryContent {
  const items = baseline.sections.flatMap((section) => {
    const sectionItems = baseline.items.filter(
      (item) => item.sectionId === section.id,
    );
    const unlocked = automaticItemOrder(
      sectionItems.filter((item) => !item.layoutLocked),
      variant,
    );
    let unlockedIndex = 0;
    return sectionItems.map((original, index) => {
      if (original.layoutLocked) {
        return structuredClone(original);
      }
      const item = unlocked[unlockedIndex++] ?? original;
      return {
        ...item,
        layout: automaticLayoutFor(item, index, sectionItems.length, variant),
      };
    });
  });
  return { sections: structuredClone(baseline.sections), items };
}

function createAutoLayoutPreview(): AutoLayoutPreview | null {
  const baseline = cloneContent();
  const candidates = [0, 1, 2]
    .map((variant) => automaticLayoutCandidate(baseline, variant))
    .filter(
      (candidate) =>
        contentFingerprint(candidate) !== contentFingerprint(baseline),
    )
    .filter(
      (candidate, index, all) =>
        all.findIndex(
          (other) => contentFingerprint(other) === contentFingerprint(candidate),
        ) === index,
    );
  const first = candidates[0];
  if (!first) {
    return null;
  }
  const changedCount = first.items.filter((item, index) => {
    const original = baseline.items.find((candidate) => candidate.id === item.id);
    return original ? original.layout !== item.layout || baseline.items[index]?.id !== item.id : false;
  }).length;
  return { baseline, candidates, candidateIndex: 0, changedCount };
}

function setStatus(
  message: string,
  state: "saved" | "saving" | "error" = "saved",
): void {
  status.textContent = message;
  status.dataset.state = state;
}

function showToast(message: string): void {
  toast.textContent = message;
  toast.dataset.open = "true";
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => {
    toast.dataset.open = "false";
  }, 3200);
}

function pushUndo(content: GalleryContent = cloneContent()): void {
  if (
    undoStack.at(-1) &&
    contentFingerprint(undoStack.at(-1)!) === contentFingerprint(content)
  ) {
    return;
  }

  undoStack.push(content);
  if (undoStack.length > 30) {
    undoStack.shift();
  }
  undoButton.disabled = false;
}

function managedSource(
  item: GalleryManifestItem,
  width: 640 | 1280 | 1920,
  format: "avif" | "webp",
): string {
  if (item.source.kind === "static") {
    const staticWidth = width === 1920 ? 1280 : width;
    return `/media/gallery/${item.source.id}-${String(staticWidth)}.${format}`;
  }

  return `/admin/gallery/media/${encodeURIComponent(item.source.key)}/${String(width)}.${format}`;
}

function layoutClass(item: GalleryManifestItem): string {
  if (item.layout === "feature") {
    return styles.galleryItemFeature;
  }

  return item.layout === "wide" ? styles.galleryItemWide : "";
}

function gallerySizes(item: GalleryManifestItem): string {
  if (item.layout === "feature") {
    return "(min-width: 76rem) 72rem, 100vw";
  }
  if (item.layout === "wide") {
    return "(min-width: 76rem) 48rem, (min-width: 60rem) 66vw, 100vw";
  }

  return "(min-width: 76rem) 24rem, (min-width: 60rem) 33vw, (min-width: 40rem) 50vw, 100vw";
}

function createPicture(item: GalleryManifestItem): HTMLPictureElement {
  const picture = document.createElement("picture");
  const localPreview = localPreviews.get(item.id);
  if (!localPreview) {
    const widths: readonly (640 | 1280 | 1920)[] =
      item.source.kind === "managed" ? [640, 1280, 1920] : [640, 1280];

    for (const format of ["avif", "webp"] as const) {
      const source = document.createElement("source");
      source.type = `image/${format}`;
      source.srcset = widths
        .map(
          (width) =>
            `${managedSource(item, width, format)} ${String(width)}w`,
        )
        .join(", ");
      source.sizes = gallerySizes(item);
      picture.append(source);
    }
  }

  const image = document.createElement("img");
  image.src = localPreview ?? managedSource(item, 640, "webp");
  image.alt = item.alt;
  image.width = item.width;
  image.height = item.height;
  image.loading = "lazy";
  image.decoding = "async";
  image.style.objectPosition = `${String(item.focalPoint.x * 100)}% ${String(item.focalPoint.y * 100)}%`;
  picture.append(image);
  picture.dataset.sourceSignature =
    localPreview ?? `${item.source.kind}:${item.source.kind === "static" ? item.source.id : item.source.key}`;
  return picture;
}

function createFigure(item: GalleryManifestItem): HTMLElement {
  const figure = document.createElement("figure");
  const button = document.createElement("button");
  const badge = document.createElement("span");
  const lock = document.createElement("span");
  const caption = document.createElement("figcaption");
  const title = document.createElement("span");
  const date = document.createElement("time");

  button.type = "button";
  badge.className = styles.galleryOrderBadge;
  badge.setAttribute("aria-hidden", "true");
  lock.className = styles.galleryLayoutLockMark;
  lock.dataset.galleryLayoutLockMark = "";
  lock.setAttribute("aria-hidden", "true");
  title.dataset.galleryCaptionTitle = "";
  date.dataset.galleryCaptionDate = "";
  button.append(badge, lock, createPicture(item));
  caption.append(title, date);
  figure.append(button, caption);
  return figure;
}

function updateFigure(
  figure: HTMLElement,
  item: GalleryManifestItem,
  index: number,
): void {
  figure.className = [
    styles.galleryItem,
    layoutClass(item),
    styles.galleryEditable,
  ]
    .filter(Boolean)
    .join(" ");
  figure.dataset.galleryId = item.id;
  figure.dataset.layout = item.layout;

  const button = figure.querySelector("button");
  const badge = figure.querySelector(`.${styles.galleryOrderBadge}`);
  const lock = figure.querySelector("[data-gallery-layout-lock-mark]");
  const picture = figure.querySelector("picture");
  const title = figure.querySelector("[data-gallery-caption-title]");
  const date = figure.querySelector("[data-gallery-caption-date]");
  if (
    !(button instanceof HTMLButtonElement) ||
    !(badge instanceof HTMLElement) ||
    !(lock instanceof HTMLElement) ||
    !(picture instanceof HTMLPictureElement) ||
    !(title instanceof HTMLElement) ||
    !(date instanceof HTMLTimeElement)
  ) {
    throw new Error(`Gallery item ${item.id} has invalid markup.`);
  }

  button.className = `${styles.galleryButton} ${styles.galleryEditorButton}`;
  if (previewOnly) {
    delete button.dataset.gallerySelect;
    button.dataset.galleryOpen = "";
    button.removeAttribute("aria-pressed");
    button.ariaLabel = `${item.title}を拡大`;
  } else {
    delete button.dataset.galleryOpen;
    button.dataset.gallerySelect = "";
    button.ariaPressed = String(
      selection?.kind === "item" && selection.id === item.id,
    );
    button.ariaLabel = `${item.title}を編集`;
  }
  button.dataset.gallerySrc = managedSource(item, 1920, "webp");
  button.dataset.galleryAlt = item.alt;
  button.dataset.galleryTitle = item.title;
  button.dataset.galleryDate = item.date ?? "";
  button.dataset.galleryWidth = String(item.width);
  button.dataset.galleryHeight = String(item.height);
  button.draggable = !previewOnly && !isAutoLayoutPreviewing();
  badge.textContent = String(index + 1).padStart(2, "0");
  lock.hidden = !item.layoutLocked;
  lock.textContent = "固定";

  const expectedSignature =
    localPreviews.get(item.id) ??
    `${item.source.kind}:${item.source.kind === "static" ? item.source.id : item.source.key}`;
  if (picture.dataset.sourceSignature !== expectedSignature) {
    picture.replaceWith(createPicture(item));
  } else {
    const image = picture.querySelector("img");
    if (image instanceof HTMLImageElement) {
      image.alt = item.alt;
      image.width = item.width;
      image.height = item.height;
      image.style.objectPosition = `${String(item.focalPoint.x * 100)}% ${String(item.focalPoint.y * 100)}%`;
    }
  }

  title.textContent = item.title;
  if (item.date) {
    date.hidden = false;
    date.dateTime = item.date;
    date.textContent = item.date;
  } else {
    date.hidden = true;
    date.removeAttribute("datetime");
    date.textContent = "";
  }
}

function capturedYears(): string {
  const years = Array.from(
    new Set(
      manifest.items
        .map((item) => item.date?.slice(0, 4))
        .filter((year): year is string => Boolean(year)),
    ),
  ).sort();

  if (years.length === 0) {
    return "—";
  }
  return years.length === 1 ? years[0]! : `${years[0]}–${years.at(-1)}`;
}

function itemsInVisualOrder(
  sections = manifest.sections,
  items = manifest.items,
): GalleryManifestItem[] {
  return sections.flatMap((section) =>
    items.filter((item) => item.sectionId === section.id),
  );
}

function createSectionElement(): HTMLElement {
  const section = document.createElement("section");
  const header = document.createElement("header");
  const heading = document.createElement("div");
  const number = document.createElement("p");
  const title = document.createElement("h2");
  const description = document.createElement("p");
  const meta = document.createElement("div");
  const count = document.createElement("span");
  const edit = document.createElement("button");
  const drag = document.createElement("button");
  const grid = document.createElement("div");
  const empty = document.createElement("p");

  section.className = styles.gallerySection;
  header.className = styles.gallerySectionHeader;
  number.className = styles.gallerySectionNumber;
  number.dataset.sectionNumber = "";
  title.dataset.sectionTitle = "";
  description.dataset.sectionDescription = "";
  heading.append(number, title, description);

  meta.className = styles.gallerySectionMeta;
  count.dataset.sectionCount = "";
  for (const button of [edit, drag]) {
    button.className = styles.gallerySectionEditButton;
    button.type = "button";
  }
  edit.dataset.sectionSelect = "";
  drag.dataset.sectionDrag = "";
  drag.draggable = true;
  edit.textContent = "編集";
  drag.textContent = "Drag";
  meta.append(count, edit, drag);
  header.append(heading, meta);

  grid.className = styles.galleryGrid;
  grid.dataset.galleryGrid = "";
  grid.dataset.sectionGrid = "";
  empty.className = styles.gallerySectionEmpty;
  empty.dataset.sectionEmpty = "";
  empty.textContent = "写真をここへドラッグ";
  grid.append(empty);
  section.append(header, grid);
  return section;
}

function updateSectionElement(
  element: HTMLElement,
  section: GallerySection,
  index: number,
  itemCount: number,
): HTMLElement {
  element.className = styles.gallerySection;
  element.dataset.gallerySection = "";
  element.dataset.sectionId = section.id;

  const number = element.querySelector("[data-section-number]");
  const title = element.querySelector("[data-section-title]");
  const description = element.querySelector("[data-section-description]");
  const count = element.querySelector("[data-section-count]");
  const edit = element.querySelector("[data-section-select]");
  const drag = element.querySelector("[data-section-drag]");
  const grid = element.querySelector("[data-section-grid]");
  let empty = element.querySelector<HTMLElement>("[data-section-empty]");
  if (
    !(number instanceof HTMLElement) ||
    !(title instanceof HTMLElement) ||
    !(description instanceof HTMLElement) ||
    !(count instanceof HTMLElement) ||
    !(edit instanceof HTMLButtonElement) ||
    !(drag instanceof HTMLButtonElement) ||
    !(grid instanceof HTMLElement)
  ) {
    throw new Error(`Gallery section ${section.id} has invalid markup.`);
  }

  number.textContent = `Section ${String(index + 1).padStart(2, "0")}`;
  title.textContent = section.title;
  description.textContent = section.description;
  description.hidden = section.description.length === 0;
  count.textContent = `${String(itemCount).padStart(2, "0")} works`;
  edit.hidden = previewOnly || isAutoLayoutPreviewing();
  edit.ariaLabel = `${section.title}セクションを編集`;
  edit.ariaPressed = String(
    selection?.kind === "section" && selection.id === section.id,
  );
  drag.hidden = previewOnly || isAutoLayoutPreviewing();
  drag.draggable = !previewOnly && !isAutoLayoutPreviewing();
  drag.ariaLabel = `${section.title}セクションをドラッグして並べ替え`;
  grid.dataset.sectionId = section.id;
  grid.ariaLabel = previewOnly
    ? `${section.title}セクション`
    : `${section.title}セクションの写真編集`;
  if (!(empty instanceof HTMLElement)) {
    empty = document.createElement("p");
    empty.className = styles.gallerySectionEmpty;
    empty.dataset.sectionEmpty = "";
    empty.textContent = "写真をここへドラッグ";
    grid.append(empty);
  }
  empty.hidden = previewOnly || itemCount > 0;
  return grid;
}

function renderInspector(): void {
  const selectedItemId =
    selection?.kind === "item" ? selection.id : undefined;
  const selectedSectionId =
    selection?.kind === "section" ? selection.id : undefined;
  const selectedItem =
    selectedItemId
      ? manifest.items.find((item) => item.id === selectedItemId)
      : undefined;
  const selectedSection =
    selectedSectionId
      ? manifest.sections.find((section) => section.id === selectedSectionId)
      : undefined;
  const open =
    Boolean(selectedItem ?? selectedSection) &&
    !previewOnly &&
    !isAutoLayoutPreviewing();
  inspector.dataset.open = String(open);
  inspector.dataset.editorKind = selectedSection ? "section" : "item";
  inspector.setAttribute("aria-hidden", String(!open));
  inspector.inert = !open;

  const photoBody = inspector.querySelector("[data-inspector-photo]");
  const sectionBody = inspector.querySelector("[data-inspector-section]");
  if (photoBody instanceof HTMLElement) {
    photoBody.hidden = !selectedItem;
  }
  if (sectionBody instanceof HTMLElement) {
    sectionBody.hidden = !selectedSection;
  }

  if (!selectedItem && !selectedSection) {
    return;
  }

  const inspectorTitle = inspector.querySelector("[data-inspector-title]");
  const inspectorPosition = inspector.querySelector("[data-inspector-position]");

  if (selectedItem) {
    if (inspectorTitle instanceof HTMLElement) {
      inspectorTitle.textContent = selectedItem.title;
    }
    if (inspectorPosition instanceof HTMLElement) {
      const section = manifest.sections.find(
        (candidate) => candidate.id === selectedItem.sectionId,
      );
      const sectionItems = manifest.items.filter(
        (item) => item.sectionId === selectedItem.sectionId,
      );
      inspectorPosition.textContent = `${section?.title ?? "Section"} · ${String(
        sectionItems.findIndex((item) => item.id === selectedItem.id) + 1,
      )} / ${String(sectionItems.length)}`;
    }

    const sectionSelect = inspector.querySelector("[data-item-section-select]");
    if (sectionSelect instanceof HTMLSelectElement) {
      const signature = manifest.sections
        .map((section) => `${section.id}:${section.title}`)
        .join("|");
      if (sectionSelect.dataset.optionsSignature !== signature) {
        sectionSelect.replaceChildren(
          ...manifest.sections.map((section) => {
            const option = document.createElement("option");
            option.value = section.id;
            option.textContent = section.title;
            return option;
          }),
        );
        sectionSelect.dataset.optionsSignature = signature;
      }
    }

    const values: Readonly<Record<string, string>> = {
      title: selectedItem.title,
      date: selectedItem.date ?? "",
      alt: selectedItem.alt,
      layout: selectedItem.layout,
      sectionId: selectedItem.sectionId,
      "focal-x": String(Math.round(selectedItem.focalPoint.x * 100)),
      "focal-y": String(Math.round(selectedItem.focalPoint.y * 100)),
    };
    inspector.querySelectorAll("[data-inspector-input]").forEach((element) => {
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        )
      ) {
        return;
      }
      const key = element.dataset.inspectorInput;
      if (key && values[key] !== undefined && element.value !== values[key]) {
        element.value = values[key];
      }
    });
    const lockButton = inspector.querySelector("[data-gallery-layout-lock]");
    if (lockButton instanceof HTMLButtonElement) {
      lockButton.ariaPressed = String(selectedItem.layoutLocked);
      lockButton.textContent = selectedItem.layoutLocked
        ? "自動配置で固定中"
        : "自動配置で動かさない";
    }
    return;
  }

  if (!selectedSection) {
    return;
  }
  if (inspectorTitle instanceof HTMLElement) {
    inspectorTitle.textContent = selectedSection.title;
  }
  if (inspectorPosition instanceof HTMLElement) {
    inspectorPosition.textContent = `Section ${String(
      manifest.sections.findIndex(
        (section) => section.id === selectedSection.id,
      ) + 1,
    )} / ${String(manifest.sections.length)}`;
  }
  const sectionValues: Readonly<Record<string, string>> = {
    title: selectedSection.title,
    description: selectedSection.description,
  };
  inspector.querySelectorAll("[data-section-input]").forEach((element) => {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }
    const key = element.dataset.sectionInput;
    if (
      key &&
      sectionValues[key] !== undefined &&
      element.value !== sectionValues[key]
    ) {
      element.value = sectionValues[key];
    }
  });
}

function animationKey(element: HTMLElement): string | null {
  if (element.dataset.galleryId) {
    return `item:${element.dataset.galleryId}`;
  }
  if (element.dataset.gallerySection !== undefined && element.dataset.sectionId) {
    return `section:${element.dataset.sectionId}`;
  }
  return null;
}

function layoutElements(): HTMLElement[] {
  return Array.from(
    canvas.querySelectorAll<HTMLElement>(
      "[data-gallery-section], [data-gallery-id]",
    ),
  );
}

function settleReorderAnimations(): void {
  layoutElements().forEach((element) => {
    element.getAnimations().forEach((animation) => {
      animation.cancel();
    });
  });
}

const reorderPreviewDuration = 120;
const reorderSettleDuration = 280;

function animateReorder(before: ReadonlyMap<string, DOMRect>): void {
  if (reducedMotion.matches) {
    return;
  }

  const duration = dragState
    ? reorderPreviewDuration
    : reorderSettleDuration;
  const draggedKey = dragState
    ? `${dragState.kind}:${dragState.id}`
    : null;
  const records = layoutElements().map((element) => {
    element.getAnimations().forEach((animation) => {
      animation.cancel();
    });
    const key = animationKey(element);
    return {
      element,
      key,
      previous: key ? before.get(key) : undefined,
      current: element.getBoundingClientRect(),
    };
  });
  const animatedSectionIds = new Set(
    records.flatMap(({ element, key, previous, current }) => {
      if (!key?.startsWith("section:")) {
        return [];
      }
      const moved =
        !previous ||
        previous.left !== current.left ||
        previous.top !== current.top;
      return moved && element.dataset.sectionId
        ? [element.dataset.sectionId]
        : [];
    }),
  );

  records.forEach(({ element, key, previous, current }) => {
    if (key === draggedKey) {
      return;
    }
    if (key?.startsWith("item:")) {
      const sectionId = element.closest<HTMLElement>(
        "[data-gallery-section]",
      )?.dataset.sectionId;
      if (sectionId && animatedSectionIds.has(sectionId)) {
        return;
      }
    }
    if (!previous) {
      element.animate(
        [
          { opacity: 0, transform: "translateY(0.5rem)" },
          { opacity: 1, transform: "none" },
        ],
        { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      return;
    }

    const x = previous.left - current.left;
    const y = previous.top - current.top;
    if (x !== 0 || y !== 0) {
      element.animate(
        [
          {
            opacity: 0.88,
            transform: `translate(${String(x)}px, ${String(y)}px)`,
          },
          { opacity: 1, transform: "none" },
        ],
        { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  });
}

function render(animate = false): void {
  const before = new Map<string, DOMRect>();
  if (animate) {
    layoutElements().forEach((element) => {
      const key = animationKey(element);
      if (key) {
        before.set(key, element.getBoundingClientRect());
      }
    });
  }

  const existingFigures = new Map<string, HTMLElement>();
  canvas.querySelectorAll<HTMLElement>("[data-gallery-id]").forEach((figure) => {
    const id = figure.dataset.galleryId;
    if (id) {
      existingFigures.set(id, figure);
    }
  });

  const activeIds = new Set(manifest.items.map((item) => item.id));
  for (const [id, figure] of existingFigures) {
    if (!activeIds.has(id)) {
      figure.remove();
    }
  }

  const existingSections = new Map<string, HTMLElement>();
  canvas
    .querySelectorAll<HTMLElement>("[data-gallery-section]")
    .forEach((section) => {
      const id = section.dataset.sectionId;
      if (id) {
        existingSections.set(id, section);
      }
    });
  const activeSectionIds = new Set(
    manifest.sections.map((section) => section.id),
  );
  for (const [id, section] of existingSections) {
    if (!activeSectionIds.has(id)) {
      section.remove();
    }
  }

  manifest.sections.forEach((section, sectionIndex) => {
    const sectionItems = manifest.items.filter(
      (item) => item.sectionId === section.id,
    );
    const element =
      existingSections.get(section.id) ?? createSectionElement();
    const grid = updateSectionElement(
      element,
      section,
      sectionIndex,
      sectionItems.length,
    );
    canvas.append(element);
    sectionItems.forEach((item) => {
      const index = manifest.items.findIndex(
        (candidate) => candidate.id === item.id,
      );
      const figure = existingFigures.get(item.id) ?? createFigure(item);
      updateFigure(figure, item, index);
      grid.append(figure);
    });
    const empty = grid.querySelector("[data-section-empty]");
    if (empty instanceof HTMLElement) {
      grid.append(empty);
    }
  });

  const count = root.querySelector("[data-gallery-count]");
  const years = root.querySelector("[data-gallery-years]");
  if (count instanceof HTMLElement) {
    count.textContent = String(manifest.items.length);
  }
  if (years instanceof HTMLElement) {
    years.textContent = capturedYears();
  }

  root.dataset.manifestVersion = String(manifest.version);
  undoButton.disabled = undoStack.length === 0 || isAutoLayoutPreviewing();
  renderInspector();
  renderAutoLayoutPreview();
  if (animate) {
    animateReorder(before);
  }
}

function renderAutoLayoutPreview(): void {
  const preview = autoLayoutPreview;
  const active = preview !== null;
  root.dataset.autoLayoutPreview = String(active);
  autoLayoutPreviewBar.hidden = !active;
  autoLayoutButton.disabled =
    active || importInProgress || saveInProgress || Boolean(dragState);
  for (const button of [
    importButton,
    addSectionButton,
    previewButton,
    saveButton,
    publishButton,
  ]) {
    button.disabled = active;
  }
  if (!preview) {
    importButton.disabled = importInProgress;
    addSectionButton.disabled = false;
    previewButton.disabled = false;
    saveButton.disabled = saveInProgress;
    publishButton.disabled = saveInProgress;
    return;
  }
  autoLayoutSummary.textContent = `案 ${String(preview.candidateIndex + 1)} / ${String(preview.candidates.length)} · ${String(preview.changedCount)}枚を整理`;
  autoLayoutNextButton.disabled = preview.candidates.length < 2;
}

function startAutoLayoutPreview(): void {
  if (
    isAutoLayoutPreviewing() ||
    importInProgress ||
    saveInProgress ||
    dragState
  ) {
    return;
  }
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  const preview = createAutoLayoutPreview();
  if (!preview) {
    showToast("固定以外の写真に、目立つ配置変更を作れませんでした。");
    return;
  }
  autoLayoutPreview = preview;
  const candidate = preview.candidates[0]!;
  manifest = { ...manifest, sections: candidate.sections, items: candidate.items };
  selection = null;
  render(true);
  setStatus("自動配置の候補を確認中");
}

function showNextAutoLayoutCandidate(): void {
  const preview = autoLayoutPreview;
  if (!preview || preview.candidates.length < 2) {
    return;
  }
  const candidateIndex = (preview.candidateIndex + 1) % preview.candidates.length;
  autoLayoutPreview = { ...preview, candidateIndex };
  const candidate = preview.candidates[candidateIndex]!;
  manifest = { ...manifest, sections: candidate.sections, items: candidate.items };
  render(true);
}

function acceptAutoLayoutPreview(): void {
  const preview = autoLayoutPreview;
  if (!preview) {
    return;
  }
  const candidate = preview.candidates[preview.candidateIndex]!;
  const changed = contentFingerprint(preview.baseline) !== contentFingerprint(candidate);
  autoLayoutPreview = null;
  manifest = { ...manifest, sections: candidate.sections, items: candidate.items };
  if (changed) {
    pushUndo(preview.baseline);
  }
  render(true);
  if (changed) {
    scheduleSave();
    showToast("自動配置を採用しました。元に戻すこともできます。");
  }
}

function cancelAutoLayoutPreview(): void {
  const preview = autoLayoutPreview;
  if (!preview) {
    return;
  }
  autoLayoutPreview = null;
  manifest = {
    ...manifest,
    sections: structuredClone(preview.baseline.sections),
    items: structuredClone(preview.baseline.items),
  };
  render(true);
  if (
    contentFingerprint(cloneContent()) !==
    contentFingerprint(cloneContent(confirmedManifest))
  ) {
    scheduleSave();
  } else {
    setStatus("下書きは同期済み");
  }
}

function scheduleSave(): void {
  if (isAutoLayoutPreviewing()) {
    return;
  }
  setStatus("未保存の変更", "saving");
  if (importInProgress || dragState) {
    saveAgain = true;
    return;
  }
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    void saveDraft();
  }, 700);
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const value: unknown = await response.json();
    if (typeof value === "object" && value !== null) {
      const error = (value as Record<string, unknown>).error;
      if (typeof error === "string") {
        return error;
      }
    }
  } catch {
    // A plain-text or empty error response is handled by the status fallback.
  }
  return `HTTP ${String(response.status)}`;
}

function adminHeaders(contentType = true): Headers {
  const headers = new Headers({
    "X-Gallery-Admin": "1",
    "X-Gallery-CSRF": bootstrap.csrfToken,
  });
  if (contentType) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

async function fetchCanonicalDraft(): Promise<GalleryManifest | null> {
  try {
    const response = await fetch("/admin/gallery/api/draft", {
      credentials: "same-origin",
      headers: adminHeaders(false),
    });
    if (!response.ok) {
      return null;
    }

    const value: unknown = await response.json();
    const responseRecord =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
    return galleryManifestSchema.parse(responseRecord.manifest);
  } catch {
    return null;
  }
}

async function fetchPublishedManifest(): Promise<GalleryManifest | null> {
  try {
    const response = await fetch("/admin/gallery/api/published", {
      credentials: "same-origin",
      headers: adminHeaders(false),
    });
    if (!response.ok) {
      return null;
    }

    const value: unknown = await response.json();
    const responseRecord =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
    return galleryManifestSchema.parse(responseRecord.manifest);
  } catch {
    return null;
  }
}

async function performSave(): Promise<boolean> {
  if (importInProgress || dragState || isAutoLayoutPreviewing()) {
    saveAgain = true;
    return true;
  }

  if (
    contentFingerprint(cloneContent(manifest)) ===
    contentFingerprint(cloneContent(confirmedManifest))
  ) {
    setStatus("下書きは同期済み");
    return true;
  }

  const sentContent = cloneContent();
  const sentFingerprint = contentFingerprint(sentContent);
  saveInProgress = true;
  setStatus("下書きを保存中", "saving");
  saveButton.disabled = true;
  publishButton.disabled = true;

  try {
    const response = await fetch("/admin/gallery/api/draft", {
      method: "PUT",
      credentials: "same-origin",
      headers: adminHeaders(),
      body: JSON.stringify({
        baseVersion: manifest.version,
        mutationId: crypto.randomUUID(),
        sections: sentContent.sections,
        items: sentContent.items,
      }),
    });

    if (response.status === 409) {
      const value: unknown = await response.json();
      if (typeof value === "object" && value !== null) {
        const canonical = galleryManifestSchema.safeParse(
          (value as Record<string, unknown>).manifest,
        );
        if (canonical.success) {
          pushUndo(cloneContent());
          manifest = structuredClone(canonical.data);
          confirmedManifest = structuredClone(canonical.data);
          render(true);
        }
      }
      setStatus("別の更新と競合しました", "error");
      showToast("サーバー側の最新版を表示しました。直前の編集は「元に戻す」から復元できます。");
      return false;
    }

    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }

    const value: unknown = await response.json();
    const responseRecord =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
    const saved = galleryManifestSchema.parse(responseRecord.manifest);
    confirmedManifest = structuredClone(saved);
    if (contentFingerprint(cloneContent()) === sentFingerprint) {
      manifest = structuredClone(saved);
    } else {
      manifest = {
        ...manifest,
        version: saved.version,
        updatedAt: saved.updatedAt,
      };
      saveAgain = true;
    }
    render();
    setStatus("下書きは同期済み");
    return true;
  } catch (error) {
    const localContent = cloneContent();
    const canonical = await fetchCanonicalDraft();
    if (canonical) {
      pushUndo(localContent);
      confirmedManifest = structuredClone(canonical);

      if (contentFingerprint(cloneContent(canonical)) === sentFingerprint) {
        if (contentFingerprint(localContent) === sentFingerprint) {
          manifest = structuredClone(canonical);
          setStatus("下書きは同期済み");
        } else {
          manifest = {
            ...manifest,
            version: canonical.version,
            updatedAt: canonical.updatedAt,
            lastMutation: canonical.lastMutation,
          };
          saveAgain = true;
          setStatus("新しい変更を再同期中", "saving");
        }
        render();
        return true;
      }

      manifest = structuredClone(canonical);
      render(true);
      setStatus("サーバー側の状態へ復旧しました", "error");
      showToast(
        "保存結果を確認し、サーバー側の最新版を表示しました。直前の編集は「元に戻す」から復元できます。",
      );
      return false;
    }

    pushUndo(cloneContent());
    manifest = structuredClone(confirmedManifest);
    render(true);
    setStatus("保存できませんでした", "error");
    showToast(
      error instanceof Error
        ? `変更を戻しました: ${error.message}`
        : "変更を戻しました。通信状態を確認してください。",
    );
    return false;
  } finally {
    saveInProgress = false;
    saveButton.disabled = false;
    publishButton.disabled = false;
  }
}

function saveDraft(): Promise<boolean> {
  if (saveQueue) {
    saveAgain = true;
    return saveQueue;
  }

  saveQueue = (async () => {
    let saved = true;
    do {
      saveAgain = false;
      saved = await performSave();
    } while (
      saved &&
      saveAgain &&
      !importInProgress &&
      !dragState &&
      !isAutoLayoutPreviewing()
    );
    if (!saved) {
      saveAgain = false;
    }
    return saved;
  })().finally(() => {
    saveQueue = null;
  });
  return saveQueue;
}

async function publish(): Promise<void> {
  if (isAutoLayoutPreviewing()) {
    return;
  }
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  const saved = await saveDraft();
  if (!saved) {
    return;
  }

  publishButton.disabled = true;
  setStatus("公開を更新中", "saving");
  const mutationId = crypto.randomUUID();
  try {
    const response = await fetch("/admin/gallery/api/publish", {
      method: "POST",
      credentials: "same-origin",
      headers: adminHeaders(),
      body: JSON.stringify({
        baseVersion: manifest.version,
        mutationId,
      }),
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response));
    }
    const value: unknown = await response.json();
    const responseRecord =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
    galleryManifestSchema.parse(responseRecord.manifest);
    setStatus("公開ページを更新しました");
    showToast("公開しました。Galleryに同じレイアウトが反映されています。");
  } catch (error) {
    const published = await fetchPublishedManifest();
    if (
      published?.lastMutation?.id === mutationId &&
      published.lastMutation.channel === "published"
    ) {
      setStatus("公開ページを更新しました");
      showToast("公開結果を確認しました。Galleryへ反映されています。");
      return;
    }

    setStatus("公開できませんでした", "error");
    showToast(
      error instanceof Error ? error.message : "公開処理に失敗しました。",
    );
  } finally {
    publishButton.disabled = false;
  }
}

function selectedIndex(): number {
  const id = selection?.kind === "item" ? selection.id : undefined;
  return id
    ? manifest.items.findIndex((item) => item.id === id)
    : -1;
}

function selectedSectionIndex(): number {
  const id = selection?.kind === "section" ? selection.id : undefined;
  return id
    ? manifest.sections.findIndex((section) => section.id === id)
    : -1;
}

function moveSelected(offset: number): void {
  const from = selectedIndex();
  const to = Math.min(
    Math.max(from + offset, 0),
    manifest.items.length - 1,
  );
  if (from < 0 || from === to) {
    return;
  }

  pushUndo();
  const items = cloneItems();
  const [item] = items.splice(from, 1);
  if (!item) {
    return;
  }
  const target = manifest.items[to];
  items.splice(to, 0, {
    ...item,
    sectionId: target?.sectionId ?? item.sectionId,
  });
  manifest = {
    ...manifest,
    items: itemsInVisualOrder(manifest.sections, items),
  };
  render(true);
  showToast(`${item.title}を${String(to + 1)}番目へ移動しました。`);
  scheduleSave();
}

function moveSelectedSection(offset: number): void {
  const from = selectedSectionIndex();
  const to = Math.min(
    Math.max(from + offset, 0),
    manifest.sections.length - 1,
  );
  if (from < 0 || from === to) {
    return;
  }

  pushUndo();
  const sections = structuredClone(manifest.sections);
  const [section] = sections.splice(from, 1);
  if (!section) {
    return;
  }
  sections.splice(to, 0, section);
  manifest = {
    ...manifest,
    sections,
    items: itemsInVisualOrder(sections),
  };
  render(true);
  showToast(`${section.title}をSection ${String(to + 1)}へ移動しました。`);
  scheduleSave();
}

function addSection(): void {
  if (manifest.sections.length >= 50) {
    showToast("セクションは50件まで追加できます。");
    return;
  }

  pushUndo();
  const section: GallerySection = {
    id: crypto.randomUUID(),
    title: `新しいセクション ${String(manifest.sections.length + 1)}`,
    description: "",
  };
  const sections = structuredClone(manifest.sections);
  const selected = selectedSectionIndex();
  const index = selected >= 0 ? selected + 1 : sections.length;
  sections.splice(index, 0, section);
  manifest = {
    ...manifest,
    sections,
    items: itemsInVisualOrder(sections),
  };
  selection = { kind: "section", id: section.id };
  render(true);
  const titleInput = inspector.querySelector(
    "[data-section-input='title']",
  );
  if (titleInput instanceof HTMLInputElement) {
    titleInput.focus({ preventScroll: true });
    titleInput.select();
  }
  showToast("セクションを追加しました。名前と説明を編集できます。");
  scheduleSave();
}

function removeSelected(): void {
  const index = selectedIndex();
  if (index < 0) {
    return;
  }
  if (manifest.items.length === 1) {
    showToast("最後の1枚は下書きから外せません。");
    return;
  }

  const removed = manifest.items[index]!;
  pushUndo();
  manifest = {
    ...manifest,
    items: manifest.items.filter((item) => item.id !== removed.id),
  };
  selection = null;
  render(true);
  showToast(`${removed.title}を下書きから外しました。元データは削除していません。`);
  scheduleSave();
}

function restoreUndo(): void {
  const previous = undoStack.pop();
  if (!previous) {
    return;
  }

  manifest = {
    ...manifest,
    sections: structuredClone(previous.sections),
    items: structuredClone(previous.items),
  };
  const selectedItemId =
    selection?.kind === "item" ? selection.id : undefined;
  if (
    selectedItemId &&
    !manifest.items.some((item) => item.id === selectedItemId)
  ) {
    selection = null;
  }
  const selectedSectionId =
    selection?.kind === "section" ? selection.id : undefined;
  if (
    selectedSectionId &&
    !manifest.sections.some((section) => section.id === selectedSectionId)
  ) {
    selection = null;
  }
  render(true);
  showToast("直前の編集を元に戻しました。");
  scheduleSave();
}

function updateSelected(field: string, value: string): void {
  const index = selectedIndex();
  const current = manifest.items[index];
  if (!current) {
    return;
  }

  let updated: GalleryManifestItem;
  if (field === "title") {
    updated = { ...current, title: value };
  } else if (field === "date") {
    updated = { ...current, date: value === "" ? null : value };
  } else if (field === "alt") {
    updated = { ...current, alt: value };
  } else if (
    field === "layout" &&
    (value === "standard" || value === "wide" || value === "feature")
  ) {
    updated = { ...current, layout: value };
  } else if (
    field === "sectionId" &&
    manifest.sections.some((section) => section.id === value)
  ) {
    updated = { ...current, sectionId: value };
  } else if (field === "focal-x" || field === "focal-y") {
    const point = Math.min(Math.max(Number(value) / 100, 0), 1);
    updated = {
      ...current,
      focalPoint: {
        ...current.focalPoint,
        [field === "focal-x" ? "x" : "y"]: point,
      },
    };
  } else {
    return;
  }

  const items = cloneItems();
  if (field === "sectionId" && updated.sectionId !== current.sectionId) {
    items.splice(index, 1);
    const lastTargetIndex = items.findLastIndex(
      (item) => item.sectionId === updated.sectionId,
    );
    items.splice(lastTargetIndex + 1, 0, updated);
  } else {
    items[index] = updated;
  }
  manifest = {
    ...manifest,
    items: itemsInVisualOrder(manifest.sections, items),
  };
  render(field === "layout" || field === "sectionId");
  scheduleSave();
}

function toggleSelectedLayoutLock(): void {
  const index = selectedIndex();
  const item = manifest.items[index];
  if (!item || isAutoLayoutPreviewing()) {
    return;
  }
  pushUndo();
  const items = cloneItems();
  items[index] = { ...item, layoutLocked: !item.layoutLocked };
  manifest = { ...manifest, items };
  render();
  scheduleSave();
}

function updateSelectedSection(field: string, value: string): void {
  const index = selectedSectionIndex();
  const current = manifest.sections[index];
  if (!current) {
    return;
  }

  let updated: GallerySection;
  if (field === "title") {
    if (value.trim().length === 0) {
      setStatus("セクション名を入力してください", "error");
      return;
    }
    updated = { ...current, title: value };
  } else if (field === "description") {
    updated = { ...current, description: value };
  } else {
    return;
  }

  const sections = structuredClone(manifest.sections);
  sections[index] = updated;
  manifest = { ...manifest, sections };
  render();
  scheduleSave();
}

function imageDate(file: File): string | null {
  const match = file.name.match(
    /(?:^|[_-])(\d{4})[-_](\d{2})[-_](\d{2})(?:[_-]|$)/u,
  );
  if (!match) {
    return null;
  }
  const value = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) ? null : value;
}

async function imageDimensions(file: File): Promise<{
  readonly width: number;
  readonly height: number;
}> {
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

function isSupportedImage(file: File): boolean {
  return (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  );
}

function parseAssetUpload(value: unknown): AssetUploadResponse {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Upload response is invalid.");
  }
  const record = value as Record<string, unknown>;
  const asset =
    typeof record.asset === "object" && record.asset !== null
      ? (record.asset as Record<string, unknown>)
      : null;
  if (
    !asset ||
    typeof asset.key !== "string" ||
    typeof asset.width !== "number" ||
    typeof asset.height !== "number"
  ) {
    throw new TypeError("Upload response is invalid.");
  }
  return {
    key: asset.key,
    width: asset.width,
    height: asset.height,
  };
}

async function uploadAsset(
  file: File,
  item: GalleryManifestItem,
): Promise<AssetUploadResponse> {
  const body = new FormData();
  body.set("file", file);
  if (item.source.kind !== "managed") {
    throw new TypeError("Only managed gallery assets can be uploaded.");
  }
  body.set("assetId", item.source.key);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetch("/admin/gallery/api/assets", {
        method: "POST",
        credentials: "same-origin",
        headers: adminHeaders(false),
        body,
      });
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Image upload failed.");
      continue;
    }

    if (response.ok) {
      return parseAssetUpload(await response.json());
    }

    const message = await errorMessage(response);
    if (response.status < 500) {
      throw new Error(message);
    }
    lastError = new Error(message);
  }

  throw lastError ?? new Error("Image upload failed.");
}

async function importFiles(inputFiles: readonly File[]): Promise<void> {
  if (importInProgress) {
    return;
  }

  const availableSlots = 500 - manifest.items.length;
  const files = inputFiles
    .filter(isSupportedImage)
    .filter((file) => file.size <= 20 * 1024 * 1024)
    .slice(0, Math.min(100, availableSlots));
  if (files.length === 0) {
    showToast("JPEG / PNG / WebP（1枚20MB以下）を含むフォルダを選んでください。");
    return;
  }

  importInProgress = true;
  importButton.disabled = true;
  saveButton.disabled = true;
  publishButton.disabled = true;
  pushUndo();
  setStatus(`${String(files.length)}枚を読み込み中`, "saving");

  const selectedImportItemId =
    selection?.kind === "item" ? selection.id : undefined;
  const targetSectionId =
    selection?.kind === "section"
      ? selection.id
      : selectedImportItemId
        ? manifest.items.find((item) => item.id === selectedImportItemId)
            ?.sectionId
        : manifest.sections.at(-1)?.id;
  if (!targetSectionId) {
    importInProgress = false;
    importButton.disabled = false;
    saveButton.disabled = false;
    publishButton.disabled = false;
    showToast("写真を追加するセクションがありません。");
    return;
  }

  const pending: Array<{ readonly file: File; readonly item: GalleryManifestItem }> = [];
  for (const [index, file] of files.entries()) {
    try {
      const dimensions = await imageDimensions(file);
      const id = crypto.randomUUID();
      const date = imageDate(file);
      const item: GalleryManifestItem = {
        id,
        sectionId: targetSectionId,
        title: date ? `VRChat ${date}` : `VRChat ${String(index + 1).padStart(2, "0")}`,
        date,
        alt: "VRChatで撮影したスクリーンショット",
        width: dimensions.width,
        height: dimensions.height,
        layout: "standard",
        layoutLocked: false,
        focalPoint: { x: 0.5, y: 0.5 },
        source: { kind: "managed", key: crypto.randomUUID() },
      };
      localPreviews.set(item.id, URL.createObjectURL(file));
      pending.push({ file, item });
    } catch {
      // Invalid image bytes are excluded before anything is sent.
    }
  }

  manifest = {
    ...manifest,
    items: itemsInVisualOrder(manifest.sections, [
      ...manifest.items,
      ...pending.map(({ item }) => item),
    ]),
  };
  render(true);

  let uploaded = 0;
  const failedIds = new Set<string>();
  for (const [index, entry] of pending.entries()) {
    setStatus(
      `${String(index + 1)} / ${String(pending.length)}枚をアップロード中`,
      "saving",
    );
    try {
      const asset = await uploadAsset(entry.file, entry.item);
      const itemIndex = manifest.items.findIndex(
        (item) => item.id === entry.item.id,
      );
      const current = manifest.items[itemIndex];
      if (current) {
        const items = cloneItems();
        items[itemIndex] = {
          ...current,
          width: asset.width,
          height: asset.height,
          source: { kind: "managed", key: asset.key },
        };
        manifest = { ...manifest, items };
      }
      const preview = localPreviews.get(entry.item.id);
      if (preview) {
        URL.revokeObjectURL(preview);
        localPreviews.delete(entry.item.id);
      }
      uploaded += 1;
      render();
    } catch {
      failedIds.add(entry.item.id);
    }
  }

  if (failedIds.size > 0) {
    manifest = {
      ...manifest,
      items: manifest.items.filter((item) => !failedIds.has(item.id)),
    };
    for (const id of failedIds) {
      const preview = localPreviews.get(id);
      if (preview) {
        URL.revokeObjectURL(preview);
        localPreviews.delete(id);
      }
    }
    render(true);
  }

  importInProgress = false;
  importButton.disabled = false;
  saveButton.disabled = false;
  publishButton.disabled = false;
  setStatus(`${String(uploaded)}枚を取り込みました`);
  showToast(
    failedIds.size === 0
      ? `${String(uploaded)}枚を下書きへ追加しました。`
      : `${String(uploaded)}枚を追加、${String(failedIds.size)}枚は読み込めませんでした。`,
  );
  await saveDraft();
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
}

async function filesInDirectory(
  directory: FileSystemDirectoryHandle,
): Promise<File[]> {
  const files: File[] = [];
  for await (const handle of directory.values()) {
    if (handle.kind === "file") {
      files.push(await handle.getFile());
    } else {
      files.push(...(await filesInDirectory(handle)));
    }
  }
  return files;
}

async function chooseFolder(): Promise<void> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) {
    folderInput.click();
    return;
  }

  try {
    const directory = await picker.call(window);
    await importFiles(await filesInDirectory(directory));
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    showToast("フォルダを開けませんでした。もう一度選択してください。");
  }
}

function announceDrag(message: string): void {
  if (dragStatus.textContent !== message) {
    dragStatus.textContent = message;
  }
}

function clearDragGhost(): void {
  dragGhost?.remove();
  dragGhost = null;
}

function createDragGhost(state: DragState): HTMLElement | null {
  clearDragGhost();

  const ghost = document.createElement("div");
  const copy = document.createElement("div");
  const kind = document.createElement("span");
  const title = document.createElement("strong");
  const meta = document.createElement("span");

  ghost.className = styles.galleryDragGhost;
  ghost.dataset.galleryDragGhost = "";
  ghost.dataset.dragGhostKind = state.kind;
  ghost.setAttribute("aria-hidden", "true");
  kind.dataset.dragGhostKindLabel = "";
  title.dataset.dragGhostTitle = "";
  meta.dataset.dragGhostMeta = "";
  copy.append(kind, title, meta);

  if (state.kind === "item") {
    const item = manifest.items.find((candidate) => candidate.id === state.id);
    const figure = canvas.querySelector<HTMLElement>(
      `[data-gallery-id="${CSS.escape(state.id)}"]`,
    );
    const image = figure?.querySelector<HTMLImageElement>("img");
    if (!item || !image) {
      return null;
    }

    const thumbnail = image.cloneNode(true) as HTMLImageElement;
    thumbnail.alt = "";
    thumbnail.draggable = false;
    const position = manifest.items.findIndex(
      (candidate) => candidate.id === state.id,
    );
    const section = manifest.sections.find(
      (candidate) => candidate.id === item.sectionId,
    );
    kind.textContent = `Photo ${String(position + 1).padStart(2, "0")}`;
    title.textContent = item.title;
    meta.textContent = section?.title ?? "Gallery";
    ghost.append(thumbnail, copy);
  } else {
    const sectionIndex = manifest.sections.findIndex(
      (candidate) => candidate.id === state.id,
    );
    const section = manifest.sections[sectionIndex];
    if (!section) {
      return null;
    }

    const count = manifest.items.filter(
      (item) => item.sectionId === state.id,
    ).length;
    kind.textContent = `Section ${String(sectionIndex + 1).padStart(2, "0")}`;
    title.textContent = section.title;
    meta.textContent = `${String(count).padStart(2, "0")} works`;
    ghost.append(copy);
  }

  document.body.append(ghost);
  dragGhost = ghost;
  return ghost;
}

function clearDropIndicators(): void {
  if (dragLabelVisibilityTimer !== null) {
    window.clearTimeout(dragLabelVisibilityTimer);
    dragLabelVisibilityTimer = null;
  }
  canvas
    .querySelectorAll<HTMLElement>(
      "[data-dragging], [data-drop-active], [data-item-drop], [data-section-drop], [data-drag-slot-label]",
    )
    .forEach((element) => {
      delete element.dataset.dragging;
      delete element.dataset.dropActive;
      delete element.dataset.itemDrop;
      delete element.dataset.sectionDrop;
      delete element.dataset.dragSlotLabel;
    });
  delete root.dataset.dragActive;
  delete root.dataset.dragKind;
  delete root.dataset.dragLabel;
  delete root.dataset.dragLabelFallback;
}

function updateDragLabelFallback(slot: HTMLElement): void {
  const bounds = slot.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const pointIsVisible =
    centerX >= 0 &&
    centerX <= window.innerWidth &&
    centerY >= 0 &&
    centerY <= window.innerHeight;
  const elementAtLabel = pointIsVisible
    ? document.elementFromPoint(centerX, centerY)
    : null;
  const slotIsVisible =
    elementAtLabel === slot ||
    (elementAtLabel !== null && slot.contains(elementAtLabel));

  if (slotIsVisible) {
    delete root.dataset.dragLabelFallback;
  } else {
    root.dataset.dragLabelFallback = "true";
  }
}

function watchDragLabelVisibility(slot: HTMLElement): void {
  updateDragLabelFallback(slot);
  dragLabelVisibilityTimer = window.setTimeout(() => {
    dragLabelVisibilityTimer = null;
    if (slot.isConnected && slot.dataset.dragSlotLabel) {
      updateDragLabelFallback(slot);
    }
  }, reorderPreviewDuration + 16);
}

function paintDragFeedback(): void {
  clearDropIndicators();
  if (!dragState) {
    return;
  }

  root.dataset.dragActive = "true";
  root.dataset.dragKind = dragState.kind;
  root.dataset.dragLabel =
    dragIntent?.kind === dragState.kind
      ? dragIntent.label
      : dragState.kind === "item"
        ? "写真を移動中 · 移動先を選択"
        : "セクションを移動中 · 移動先を選択";
  root.dataset.dragLabelFallback = "true";

  const source =
    dragState.kind === "item"
      ? canvas.querySelector<HTMLElement>(
          `[data-gallery-id="${CSS.escape(dragState.id)}"]`,
        )
      : canvas.querySelector<HTMLElement>(
          `[data-gallery-section][data-section-id="${CSS.escape(dragState.id)}"]`,
        );
  if (source) {
    source.dataset.dragging = "true";
    if (dragIntent?.kind === dragState.kind) {
      const slot =
        dragState.kind === "section"
          ? source.querySelector<HTMLElement>("[data-section-grid]")
          : source;
      if (slot) {
        slot.dataset.dragSlotLabel = dragIntent.slotLabel;
        watchDragLabelVisibility(slot);
      }
    }
  }

  if (!dragIntent || dragIntent.kind !== dragState.kind) {
    return;
  }

  if (dragIntent.kind === "item") {
    const grid = canvas.querySelector<HTMLElement>(
      `[data-section-grid][data-section-id="${CSS.escape(dragIntent.targetSectionId)}"]`,
    );
    if (!grid) {
      return;
    }
    grid.dataset.dropActive = "true";
    const items = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-gallery-id]"),
    );
    const sourceId = dragState.id;
    const sourceIndex = items.findIndex(
      (item) => item.dataset.galleryId === sourceId,
    );
    const marker = items[sourceIndex];
    if (marker) {
      const previous = sourceIndex > 0 ? items[sourceIndex - 1] : undefined;
      const sharesRow =
        previous !== undefined &&
        Math.min(
          previous.offsetTop + previous.offsetHeight,
          marker.offsetTop + marker.offsetHeight,
        ) > Math.max(previous.offsetTop, marker.offsetTop);
      const markerAxis: ItemDropAxis =
        sharesRow &&
        marker.offsetWidth < grid.clientWidth * 0.8
          ? "inline"
          : "block";
      marker.dataset.itemDrop = `${markerAxis}-before`;
    }
    return;
  }

  const marker =
    dragIntent.beforeId === null
      ? Array.from(
          canvas.querySelectorAll<HTMLElement>("[data-gallery-section]"),
        ).at(-1)
      : canvas.querySelector<HTMLElement>(
          `[data-gallery-section][data-section-id="${CSS.escape(dragIntent.beforeId)}"]`,
        );
  if (marker) {
    marker.dataset.sectionDrop =
      dragIntent.beforeId === null ? "after" : "before";
  }
}

const dragIntentHysteresis = 12;
const dropZoneStickiness = 20;

function pointDistanceToRect(
  point: DragPoint,
  bounds: DOMRect,
): number {
  const x =
    point.x < bounds.left
      ? bounds.left - point.x
      : point.x > bounds.right
        ? point.x - bounds.right
        : 0;
  const y =
    point.y < bounds.top
      ? bounds.top - point.y
      : point.y > bounds.bottom
        ? point.y - bounds.bottom
        : 0;
  return Math.hypot(x, y);
}

function eventPoint(event: DragEvent): DragPoint {
  return { x: event.clientX, y: event.clientY };
}

function canChangeDragIntent(event: DragEvent): boolean {
  if (!dragIntent || !acceptedDragPoint) {
    return true;
  }
  return (
    Math.hypot(
      event.clientX - acceptedDragPoint.x,
      event.clientY - acceptedDragPoint.y,
    ) >= dragIntentHysteresis
  );
}

function rememberAcceptedDragPoint(event: DragEvent): void {
  acceptedDragPoint = eventPoint(event);
}

function itemTargetGrid(event: DragEvent): HTMLElement | null {
  const grids = Array.from(
    canvas.querySelectorAll<HTMLElement>("[data-section-grid]"),
  );
  if (grids.length === 0) {
    return null;
  }

  if (dragIntent?.kind === "item") {
    const current = canvas.querySelector<HTMLElement>(
      `[data-section-grid][data-section-id="${CSS.escape(dragIntent.targetSectionId)}"]`,
    );
    if (
      current &&
      pointDistanceToRect(eventPoint(event), current.getBoundingClientRect()) <=
        dropZoneStickiness
    ) {
      return current;
    }
  }

  const target =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-section-grid]")
      : null;
  if (target) {
    return target;
  }

  const point = eventPoint(event);
  return grids.reduce((closest, candidate) =>
    pointDistanceToRect(point, candidate.getBoundingClientRect()) <
    pointDistanceToRect(point, closest.getBoundingClientRect())
      ? candidate
      : closest,
  );
}

function itemPlacementAtPoint(
  grid: HTMLElement,
  sourceId: string,
  event: DragEvent,
): ItemPlacement | null {
  const targetSectionId = grid.dataset.sectionId;
  if (!targetSectionId) {
    return null;
  }
  const entries = manifest.items.filter(
    (item) =>
      item.sectionId === targetSectionId && item.id !== sourceId,
  );
  if (entries.length === 0) {
    return { beforeId: null, markerAxis: "block" };
  }

  const candidates = entries.flatMap((entry) => {
    const element = grid.querySelector<HTMLElement>(
      `[data-gallery-id="${CSS.escape(entry.id)}"]`,
    );
    return element
      ? [{ entry, bounds: element.getBoundingClientRect() }]
      : [];
  });
  if (candidates.length === 0) {
    return null;
  }

  const point = eventPoint(event);
  const closest = candidates.reduce((current, candidate) =>
    pointDistanceToRect(point, candidate.bounds) <
    pointDistanceToRect(point, current.bounds)
      ? candidate
      : current,
  );
  const gridBounds = grid.getBoundingClientRect();
  const withinBlock =
    point.y >= closest.bounds.top && point.y <= closest.bounds.bottom;
  const markerAxis: ItemDropAxis =
    withinBlock && closest.bounds.width < gridBounds.width * 0.8
      ? "inline"
      : "block";
  const position: DropPosition =
    markerAxis === "inline"
      ? point.x < closest.bounds.left + closest.bounds.width / 2
        ? "before"
        : "after"
      : point.y < closest.bounds.top + closest.bounds.height / 2
        ? "before"
        : "after";
  const beforeId = beforeIdForDrop(
    entries,
    closest.entry.id,
    position,
  );
  return beforeId === undefined
    ? null
    : { beforeId, markerAxis };
}

function sectionPlacementAtPoint(
  sourceId: string,
  event: DragEvent,
): string | null {
  const point = eventPoint(event);
  const boundaries = manifest.sections
    .filter((section) => section.id !== sourceId)
    .flatMap((section) => {
      const element = canvas.querySelector<HTMLElement>(
        `[data-gallery-section][data-section-id="${CSS.escape(section.id)}"]`,
      );
      const header = element?.querySelector<HTMLElement>("header");
      if (!header) {
        return [];
      }
      const bounds = header.getBoundingClientRect();
      return [{ id: section.id, midpoint: bounds.top + bounds.height / 2 }];
    });
  return boundaries.find((boundary) => point.y < boundary.midpoint)?.id ?? null;
}

function beforeIdForDrop(
  entries: readonly { readonly id: string }[],
  targetId: string,
  position: DropPosition,
): string | null | undefined {
  const targetIndex = entries.findIndex((entry) => entry.id === targetId);
  if (targetIndex < 0) {
    return undefined;
  }
  return position === "before"
    ? targetId
    : (entries[targetIndex + 1]?.id ?? null);
}

function itemContentAtPlacement(
  sourceId: string,
  targetSectionId: string,
  beforeId: string | null,
): GalleryContent | null {
  const source = manifest.items.find((item) => item.id === sourceId);
  if (!source) {
    return null;
  }

  const groups = new Map(
    manifest.sections.map((section) => [
      section.id,
      cloneItems(
        manifest.items.filter(
          (item) => item.sectionId === section.id && item.id !== sourceId,
        ),
      ),
    ]),
  );
  const targetItems = groups.get(targetSectionId);
  if (!targetItems) {
    return null;
  }
  const insertionIndex =
    beforeId === null
      ? targetItems.length
      : targetItems.findIndex((item) => item.id === beforeId);
  if (insertionIndex < 0) {
    return null;
  }
  targetItems.splice(insertionIndex, 0, {
    ...structuredClone(source),
    sectionId: targetSectionId,
  });
  return {
    sections: structuredClone(manifest.sections),
    items: manifest.sections.flatMap(
      (section) => groups.get(section.id) ?? [],
    ),
  };
}

function sectionContentAtPlacement(
  sourceId: string,
  beforeId: string | null,
): GalleryContent | null {
  const sections = structuredClone(manifest.sections);
  const sourceIndex = sections.findIndex((section) => section.id === sourceId);
  const [moved] = sourceIndex >= 0 ? sections.splice(sourceIndex, 1) : [];
  if (!moved) {
    return null;
  }
  const insertionIndex =
    beforeId === null
      ? sections.length
      : sections.findIndex((section) => section.id === beforeId);
  if (insertionIndex < 0) {
    return null;
  }
  sections.splice(insertionIndex, 0, moved);
  return {
    sections,
    items: cloneItems(itemsInVisualOrder(sections)),
  };
}

function previewItemPlacement(
  sourceId: string,
  targetSectionId: string,
  placement: ItemPlacement,
  event: DragEvent,
): boolean {
  if (
    dragIntent?.kind === "item" &&
    dragIntent.targetSectionId === targetSectionId &&
    dragIntent.beforeId === placement.beforeId
  ) {
    if (
      dragIntent.markerAxis !== placement.markerAxis &&
      canChangeDragIntent(event)
    ) {
      dragIntent = {
        ...dragIntent,
        markerAxis: placement.markerAxis,
      };
      rememberAcceptedDragPoint(event);
    }
    paintDragFeedback();
    return true;
  }
  if (!canChangeDragIntent(event)) {
    paintDragFeedback();
    return true;
  }

  const next = itemContentAtPlacement(
    sourceId,
    targetSectionId,
    placement.beforeId,
  );
  if (!next) {
    return false;
  }

  if (
    contentFingerprint(next) !== contentFingerprint(cloneContent())
  ) {
    manifest = {
      ...manifest,
      sections: next.sections,
      items: next.items,
    };
    render(true);
  }

  const section = manifest.sections.find(
    (candidate) => candidate.id === targetSectionId,
  );
  const item = manifest.items.find(
    (candidate) => candidate.id === sourceId,
  );
  const position =
    manifest.items
      .filter((item) => item.sectionId === targetSectionId)
      .findIndex((item) => item.id === sourceId) + 1;
  dragIntent = {
    kind: "item",
    targetSectionId,
    beforeId: placement.beforeId,
    markerAxis: placement.markerAxis,
    label: `移動先 · ${section?.title ?? "セクション"} / ${String(position).padStart(2, "0")}`,
    slotLabel: `移動先 · ${String(position).padStart(2, "0")}`,
  };
  rememberAcceptedDragPoint(event);
  announceDrag(
    `${item?.title ?? "写真"}の移動先は、${section?.title ?? "セクション"}の${String(position)}番目です。`,
  );
  paintDragFeedback();
  return true;
}

function previewSectionPlacement(
  sourceId: string,
  beforeId: string | null,
  event: DragEvent,
): boolean {
  if (
    dragIntent?.kind === "section" &&
    dragIntent.beforeId === beforeId
  ) {
    paintDragFeedback();
    return true;
  }
  if (!canChangeDragIntent(event)) {
    paintDragFeedback();
    return true;
  }

  const next = sectionContentAtPlacement(sourceId, beforeId);
  if (!next) {
    return false;
  }

  if (
    contentFingerprint(next) !== contentFingerprint(cloneContent())
  ) {
    manifest = {
      ...manifest,
      sections: next.sections,
      items: next.items,
    };
    render(true);
  }

  const position =
    manifest.sections.findIndex((section) => section.id === sourceId) + 1;
  const section = manifest.sections[position - 1];
  dragIntent = {
    kind: "section",
    beforeId,
    label: `移動先 · Section ${String(position).padStart(2, "0")} / ${section?.title ?? ""}`,
    slotLabel: `移動先 · Section ${String(position).padStart(2, "0")}`,
  };
  rememberAcceptedDragPoint(event);
  announceDrag(
    `${section?.title ?? "セクション"}の移動先は、Section ${String(position)}です。`,
  );
  paintDragFeedback();
  return true;
}

function resumeSaveAfterDrag(): void {
  if (
    contentFingerprint(cloneContent()) !==
    contentFingerprint(cloneContent(confirmedManifest))
  ) {
    scheduleSave();
  } else if (!saveQueue) {
    saveAgain = false;
    setStatus("下書きは同期済み");
  }
}

function commitDrag(): void {
  const currentDrag = dragState;
  if (!currentDrag || dragIntent?.kind !== currentDrag.kind) {
    cancelDrag();
    return;
  }

  const changed =
    contentFingerprint(currentDrag.snapshot) !==
    contentFingerprint(cloneContent());
  clearDragGhost();
  dragStatus.textContent = "";
  dragState = null;
  dragIntent = null;
  acceptedDragPoint = null;
  clearDropIndicators();

  if (changed) {
    pushUndo(currentDrag.snapshot);
  }
  selection = { kind: currentDrag.kind, id: currentDrag.id };
  render();

  if (changed && currentDrag.kind === "item") {
    const item = manifest.items.find(
      (candidate) => candidate.id === currentDrag.id,
    );
    const section = manifest.sections.find(
      (candidate) => candidate.id === item?.sectionId,
    );
    const position =
      manifest.items
        .filter((candidate) => candidate.sectionId === item?.sectionId)
        .findIndex((candidate) => candidate.id === currentDrag.id) + 1;
    showToast(
      `${item?.title ?? "写真"}を${section?.title ?? "セクション"}の${String(position)}番目へ移動しました。`,
    );
  } else if (changed) {
    const section = manifest.sections.find(
      (candidate) => candidate.id === currentDrag.id,
    );
    const position =
      manifest.sections.findIndex(
        (candidate) => candidate.id === currentDrag.id,
      ) + 1;
    showToast(
      `${section?.title ?? "セクション"}をSection ${String(position)}へ移動しました。`,
    );
  }

  resumeSaveAfterDrag();
}

function cancelDrag(): void {
  const currentDrag = dragState;
  if (!currentDrag) {
    return;
  }
  const changed =
    contentFingerprint(currentDrag.snapshot) !==
    contentFingerprint(cloneContent());
  clearDragGhost();
  dragState = null;
  dragIntent = null;
  acceptedDragPoint = null;
  clearDropIndicators();
  manifest = {
    ...manifest,
    sections: structuredClone(currentDrag.snapshot.sections),
    items: structuredClone(currentDrag.snapshot.items),
  };
  render(changed);
  announceDrag("移動を取り消しました。");
  resumeSaveAfterDrag();
}

canvas.addEventListener("click", (event) => {
  if (previewOnly || isAutoLayoutPreviewing()) {
    return;
  }
  const target = event.target;
  const photoButton =
    target instanceof Element
      ? target.closest<HTMLButtonElement>("[data-gallery-select]")
      : null;
  const figure = photoButton?.closest<HTMLElement>("[data-gallery-id]");
  if (photoButton && figure?.dataset.galleryId) {
    selection = { kind: "item", id: figure.dataset.galleryId };
    render();
    figure.scrollIntoView({
      block: window.matchMedia("(min-width: 64rem)").matches
        ? "center"
        : "start",
      inline: "nearest",
    });
    const titleInput = inspector.querySelector(
      "[data-inspector-input='title']",
    );
    if (titleInput instanceof HTMLInputElement) {
      titleInput.focus({ preventScroll: true });
    }
    return;
  }

  const sectionButton =
    target instanceof Element
      ? target.closest<HTMLButtonElement>("[data-section-select]")
      : null;
  const section = sectionButton?.closest<HTMLElement>(
    "[data-gallery-section]",
  );
  if (sectionButton && section?.dataset.sectionId) {
    selection = { kind: "section", id: section.dataset.sectionId };
    render();
    const titleInput = inspector.querySelector(
      "[data-section-input='title']",
    );
    if (titleInput instanceof HTMLInputElement) {
      titleInput.focus({ preventScroll: true });
    }
  }
});

canvas.addEventListener("keydown", (event) => {
  if (isAutoLayoutPreviewing()) {
    return;
  }
  if (
    !event.altKey ||
    !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
  ) {
    return;
  }
  const target = event.target;
  const figure =
    target instanceof Element
      ? target.closest<HTMLElement>("[data-gallery-id]")
      : null;
  if (figure?.dataset.galleryId) {
    event.preventDefault();
    selection = { kind: "item", id: figure.dataset.galleryId };
    moveSelected(
      event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1,
    );
    return;
  }

  const section =
    target instanceof Element
      ? target.closest<HTMLElement>("[data-gallery-section]")
      : null;
  if (section?.dataset.sectionId) {
    event.preventDefault();
    selection = { kind: "section", id: section.dataset.sectionId };
    moveSelectedSection(
      event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1,
    );
  }
});

canvas.addEventListener("dragstart", (event) => {
  if (saveInProgress || importInProgress || isAutoLayoutPreviewing()) {
    event.preventDefault();
    showToast(
      importInProgress
        ? "写真の取り込み完了後に移動できます。"
        : isAutoLayoutPreviewing()
          ? "自動配置を採用または取り消してから移動できます。"
          : "下書きの保存完了後に移動できます。",
    );
    return;
  }

  const target = event.target;
  const figure =
    target instanceof Element
      ? target.closest<HTMLElement>("[data-gallery-id]")
      : null;
  if (figure?.dataset.galleryId && !previewOnly) {
    settleReorderAnimations();
    const id = figure.dataset.galleryId;
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
      saveAgain = true;
    }
    dragState = { kind: "item", id, snapshot: cloneContent() };
    dragIntent = null;
    acceptedDragPoint = null;
    const ghost = createDragGhost(dragState);
    if (event.dataTransfer && ghost) {
      event.dataTransfer.setDragImage(ghost, 28, 24);
    }
    const item = manifest.items.find((candidate) => candidate.id === id);
    announceDrag(`${item?.title ?? "写真"}を移動中です。移動先を選択してください。`);
    paintDragFeedback();
    event.dataTransfer?.setData("text/plain", `item:${id}`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
    return;
  }

  const dragButton =
    target instanceof Element
      ? target.closest<HTMLButtonElement>("[data-section-drag]")
      : null;
  const section = dragButton?.closest<HTMLElement>(
    "[data-gallery-section]",
  );
  if (!section?.dataset.sectionId || previewOnly) {
    event.preventDefault();
    return;
  }
  settleReorderAnimations();
  const id = section.dataset.sectionId;
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
    saveAgain = true;
  }
  dragState = { kind: "section", id, snapshot: cloneContent() };
  dragIntent = null;
  acceptedDragPoint = null;
  const ghost = createDragGhost(dragState);
  if (event.dataTransfer && ghost) {
    event.dataTransfer.setDragImage(ghost, 28, 24);
  }
  const draggedSection = manifest.sections.find(
    (candidate) => candidate.id === id,
  );
  announceDrag(
    `${draggedSection?.title ?? "セクション"}を移動中です。移動先を選択してください。`,
  );
  paintDragFeedback();
  event.dataTransfer?.setData("text/plain", `section:${id}`);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
});

canvas.addEventListener("dragover", (event) => {
  if (previewOnly || isAutoLayoutPreviewing() || !dragState) {
    return;
  }
  const currentDrag = dragState;

  if (currentDrag.kind === "item") {
    const grid = itemTargetGrid(event);
    const placement = grid
      ? itemPlacementAtPoint(grid, currentDrag.id, event)
      : null;
    const targetSectionId = grid?.dataset.sectionId;
    if (
      targetSectionId &&
      placement &&
      previewItemPlacement(
        currentDrag.id,
        targetSectionId,
        placement,
        event,
      )
    ) {
      event.preventDefault();
    } else {
      paintDragFeedback();
    }
  } else if (
    previewSectionPlacement(
      currentDrag.id,
      sectionPlacementAtPoint(currentDrag.id, event),
      event,
    )
  ) {
    event.preventDefault();
  } else {
    paintDragFeedback();
  }
  if (event.defaultPrevented && event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
});

canvas.addEventListener("drop", (event) => {
  if (!dragState) {
    return;
  }
  if (dragIntent?.kind === dragState.kind) {
    event.preventDefault();
    commitDrag();
    return;
  }
  cancelDrag();
});

canvas.addEventListener("dragend", () => {
  cancelDrag();
});

document.addEventListener("dragover", (event) => {
  if (
    dragState &&
    (!(event.target instanceof Node) || !canvas.contains(event.target))
  ) {
    clearDropIndicators();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dragState) {
    event.preventDefault();
    cancelDrag();
  }
});

inspector.addEventListener("focusin", (event) => {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.matches("[data-inspector-input], [data-section-input]") &&
    !inspectorEditStart
  ) {
    inspectorEditStart = cloneContent();
  }
});

inspector.addEventListener("focusout", (event) => {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.matches("[data-inspector-input], [data-section-input]") &&
    inspectorEditStart &&
    contentFingerprint(inspectorEditStart) !==
      contentFingerprint(cloneContent())
  ) {
    pushUndo(inspectorEditStart);
  }
  inspectorEditStart = null;
});

inspector.addEventListener("input", (event) => {
  const target = event.target;
  if (
    !(
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    )
  ) {
    return;
  }
  const field = target.dataset.inspectorInput;
  if (field) {
    updateSelected(field, target.value);
    return;
  }
  const sectionField = target.dataset.sectionInput;
  if (sectionField) {
    updateSelectedSection(sectionField, target.value);
  }
});

inspector.querySelector("[data-inspector-close]")?.addEventListener("click", () => {
  const returnFocus =
    selection?.kind === "item"
      ? canvas.querySelector<HTMLButtonElement>(
          `[data-gallery-id="${CSS.escape(selection.id)}"] [data-gallery-select]`,
        )
      : selection?.kind === "section"
        ? canvas.querySelector<HTMLButtonElement>(
            `[data-gallery-section][data-section-id="${CSS.escape(selection.id)}"] [data-section-select]`,
          )
        : null;
  selection = null;
  renderInspector();
  returnFocus?.focus({ preventScroll: true });
});
inspector.querySelector("[data-gallery-remove]")?.addEventListener("click", removeSelected);
inspector
  .querySelector("[data-gallery-layout-lock]")
  ?.addEventListener("click", toggleSelectedLayoutLock);
inspector.querySelectorAll<HTMLButtonElement>("[data-gallery-move]").forEach((button) => {
  button.addEventListener("click", () => {
    moveSelected(Number(button.dataset.galleryMove));
  });
});
inspector.querySelectorAll<HTMLButtonElement>("[data-section-move]").forEach((button) => {
  button.addEventListener("click", () => {
    moveSelectedSection(Number(button.dataset.sectionMove));
  });
});
inspector
  .querySelector("[data-section-focus-import]")
  ?.addEventListener("click", () => {
    void chooseFolder();
  });

undoButton.addEventListener("click", restoreUndo);
saveButton.addEventListener("click", () => {
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  void saveDraft();
});
publishButton.addEventListener("click", () => {
  void publish();
});
importButton.addEventListener("click", () => {
  void chooseFolder();
});
addSectionButton.addEventListener("click", addSection);
autoLayoutButton.addEventListener("click", startAutoLayoutPreview);
autoLayoutNextButton.addEventListener("click", showNextAutoLayoutCandidate);
autoLayoutAcceptButton.addEventListener("click", acceptAutoLayoutPreview);
autoLayoutCancelButton.addEventListener("click", cancelAutoLayoutPreview);
folderInput.addEventListener("change", () => {
  const files = folderInput.files ? Array.from(folderInput.files) : [];
  folderInput.value = "";
  void importFiles(files);
});
previewButton.addEventListener("click", () => {
  previewOnly = !previewOnly;
  root.dataset.preview = String(previewOnly);
  previewButton.ariaPressed = String(previewOnly);
  previewButton.textContent = previewOnly ? "編集に戻る" : "表示だけ";
  render();
});

inspector.inert = true;
render();
