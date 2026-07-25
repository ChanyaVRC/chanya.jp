import {
  galleryManifestSchema,
  type GalleryManifest,
  type GalleryManifestItem,
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
const grid = requiredElement(root, "[data-gallery-grid]", isHtmlElement);
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
const folderInput = requiredElement(
  root,
  "[data-gallery-folder-input]",
  (element): element is HTMLInputElement => element instanceof HTMLInputElement,
);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const localPreviews = new Map<string, string>();
const undoStack: GalleryManifestItem[][] = [];
let manifest = structuredClone(bootstrap.manifest);
let confirmedManifest = structuredClone(bootstrap.manifest);
let selectedId: string | null = null;
let previewOnly = false;
let importInProgress = false;
let saveTimer: number | null = null;
let saveInFlight: Promise<boolean> | null = null;
let saveAgain = false;
let toastTimer: number | null = null;
let inspectorEditStart: GalleryManifestItem[] | null = null;
let dragStartItems: GalleryManifestItem[] | null = null;

function itemFingerprint(items: readonly GalleryManifestItem[]): string {
  return JSON.stringify(items);
}

function cloneItems(items = manifest.items): GalleryManifestItem[] {
  return structuredClone(items);
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

function pushUndo(items: GalleryManifestItem[] = cloneItems()): void {
  if (
    undoStack.at(-1) &&
    itemFingerprint(undoStack.at(-1)!) === itemFingerprint(items)
  ) {
    return;
  }

  undoStack.push(items);
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
  const caption = document.createElement("figcaption");
  const title = document.createElement("span");
  const date = document.createElement("time");

  button.type = "button";
  badge.className = styles.galleryOrderBadge;
  badge.setAttribute("aria-hidden", "true");
  title.dataset.galleryCaptionTitle = "";
  date.dataset.galleryCaptionDate = "";
  button.append(badge, createPicture(item));
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
  const picture = figure.querySelector("picture");
  const title = figure.querySelector("[data-gallery-caption-title]");
  const date = figure.querySelector("[data-gallery-caption-date]");
  if (
    !(button instanceof HTMLButtonElement) ||
    !(badge instanceof HTMLElement) ||
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
    button.ariaPressed = String(selectedId === item.id);
    button.ariaLabel = `${item.title}を編集`;
  }
  button.dataset.gallerySrc = managedSource(item, 1920, "webp");
  button.dataset.galleryAlt = item.alt;
  button.dataset.galleryTitle = item.title;
  button.dataset.galleryDate = item.date ?? "";
  button.dataset.galleryWidth = String(item.width);
  button.dataset.galleryHeight = String(item.height);
  button.draggable = !previewOnly;
  badge.textContent = String(index + 1).padStart(2, "0");

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

function renderInspector(): void {
  const selected = manifest.items.find((item) => item.id === selectedId);
  const open = Boolean(selected) && !previewOnly;
  inspector.dataset.open = String(open);
  inspector.setAttribute("aria-hidden", String(!open));
  inspector.inert = !open;

  if (!selected) {
    return;
  }

  const inspectorTitle = inspector.querySelector("[data-inspector-title]");
  const inspectorPosition = inspector.querySelector("[data-inspector-position]");
  if (inspectorTitle instanceof HTMLElement) {
    inspectorTitle.textContent = selected.title;
  }
  if (inspectorPosition instanceof HTMLElement) {
    inspectorPosition.textContent = `${String(
      manifest.items.findIndex((item) => item.id === selected.id) + 1,
    )} / ${String(manifest.items.length)}`;
  }

  const values: Readonly<Record<string, string>> = {
    title: selected.title,
    date: selected.date ?? "",
    alt: selected.alt,
    layout: selected.layout,
    "focal-x": String(Math.round(selected.focalPoint.x * 100)),
    "focal-y": String(Math.round(selected.focalPoint.y * 100)),
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
}

function animateReorder(before: ReadonlyMap<string, DOMRect>): void {
  if (reducedMotion.matches) {
    return;
  }

  grid.querySelectorAll<HTMLElement>("[data-gallery-id]").forEach((figure) => {
    const id = figure.dataset.galleryId;
    const previous = id ? before.get(id) : undefined;
    if (!previous) {
      figure.animate(
        [
          { opacity: 0, transform: "translateY(0.5rem)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      return;
    }

    const current = figure.getBoundingClientRect();
    const x = previous.left - current.left;
    const y = previous.top - current.top;
    if (x !== 0 || y !== 0) {
      figure.animate(
        [
          { transform: `translate(${String(x)}px, ${String(y)}px)` },
          { transform: "none" },
        ],
        { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  });
}

function render(animate = false): void {
  const before = new Map<string, DOMRect>();
  if (animate) {
    grid.querySelectorAll<HTMLElement>("[data-gallery-id]").forEach((figure) => {
      const id = figure.dataset.galleryId;
      if (id) {
        before.set(id, figure.getBoundingClientRect());
      }
    });
  }

  const existing = new Map<string, HTMLElement>();
  grid.querySelectorAll<HTMLElement>("[data-gallery-id]").forEach((figure) => {
    const id = figure.dataset.galleryId;
    if (id) {
      existing.set(id, figure);
    }
  });

  const activeIds = new Set(manifest.items.map((item) => item.id));
  for (const [id, figure] of existing) {
    if (!activeIds.has(id)) {
      figure.remove();
    }
  }

  manifest.items.forEach((item, index) => {
    const figure = existing.get(item.id) ?? createFigure(item);
    updateFigure(figure, item, index);
    grid.append(figure);
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
  undoButton.disabled = undoStack.length === 0;
  renderInspector();
  if (animate) {
    animateReorder(before);
  }
}

function scheduleSave(): void {
  if (importInProgress) {
    saveAgain = true;
    return;
  }
  setStatus("未保存の変更", "saving");
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
  if (importInProgress) {
    saveAgain = true;
    return true;
  }

  if (itemFingerprint(manifest.items) === itemFingerprint(confirmedManifest.items)) {
    setStatus("下書きは同期済み");
    return true;
  }

  const sentItems = cloneItems();
  const sentFingerprint = itemFingerprint(sentItems);
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
        items: sentItems,
      }),
    });

    if (response.status === 409) {
      const value: unknown = await response.json();
      if (typeof value === "object" && value !== null) {
        const canonical = galleryManifestSchema.safeParse(
          (value as Record<string, unknown>).manifest,
        );
        if (canonical.success) {
          pushUndo(cloneItems());
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
    if (itemFingerprint(manifest.items) === sentFingerprint) {
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
    const localItems = cloneItems();
    const canonical = await fetchCanonicalDraft();
    if (canonical) {
      pushUndo(localItems);
      confirmedManifest = structuredClone(canonical);

      if (itemFingerprint(canonical.items) === sentFingerprint) {
        if (itemFingerprint(localItems) === sentFingerprint) {
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

    pushUndo(cloneItems());
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
    saveButton.disabled = false;
    publishButton.disabled = false;
  }
}

async function saveDraft(): Promise<boolean> {
  if (saveInFlight) {
    saveAgain = true;
    return saveInFlight;
  }

  saveInFlight = performSave();
  const saved = await saveInFlight;
  saveInFlight = null;
  if (saved && saveAgain && !importInProgress) {
    saveAgain = false;
    return saveDraft();
  }
  if (!saved) {
    saveAgain = false;
  }
  return saved;
}

async function publish(): Promise<void> {
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
  return manifest.items.findIndex((item) => item.id === selectedId);
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
  items.splice(to, 0, item);
  manifest = { ...manifest, items };
  render(true);
  showToast(`${item.title}を${String(to + 1)}番目へ移動しました。`);
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
  selectedId = null;
  render(true);
  showToast(`${removed.title}を下書きから外しました。元データは削除していません。`);
  scheduleSave();
}

function restoreUndo(): void {
  const previous = undoStack.pop();
  if (!previous) {
    return;
  }

  manifest = { ...manifest, items: structuredClone(previous) };
  if (selectedId && !manifest.items.some((item) => item.id === selectedId)) {
    selectedId = null;
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
  items[index] = updated;
  manifest = { ...manifest, items };
  render(field === "layout");
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

  const pending: Array<{ readonly file: File; readonly item: GalleryManifestItem }> = [];
  for (const [index, file] of files.entries()) {
    try {
      const dimensions = await imageDimensions(file);
      const id = crypto.randomUUID();
      const date = imageDate(file);
      const item: GalleryManifestItem = {
        id,
        title: date ? `VRChat ${date}` : `VRChat ${String(index + 1).padStart(2, "0")}`,
        date,
        alt: "VRChatで撮影したスクリーンショット",
        width: dimensions.width,
        height: dimensions.height,
        layout: "standard",
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
    items: [...manifest.items, ...pending.map(({ item }) => item)],
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

grid.addEventListener("click", (event) => {
  if (previewOnly) {
    return;
  }
  const target = event.target;
  const button =
    target instanceof Element
      ? target.closest<HTMLButtonElement>("[data-gallery-select]")
      : null;
  const figure = button?.closest<HTMLElement>("[data-gallery-id]");
  if (!button || !figure?.dataset.galleryId) {
    return;
  }
  selectedId = figure.dataset.galleryId;
  render();
  figure.scrollIntoView({
    block: window.matchMedia("(min-width: 64rem)").matches ? "center" : "start",
    inline: "nearest",
  });
  const titleInput = inspector.querySelector(
    "[data-inspector-input='title']",
  );
  if (titleInput instanceof HTMLInputElement) {
    titleInput.focus({ preventScroll: true });
  }
});

grid.addEventListener("keydown", (event) => {
  if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
    return;
  }
  const target = event.target;
  const figure =
    target instanceof Element
      ? target.closest<HTMLElement>("[data-gallery-id]")
      : null;
  if (!figure?.dataset.galleryId) {
    return;
  }
  event.preventDefault();
  selectedId = figure.dataset.galleryId;
  moveSelected(event.key === "ArrowLeft" ? -1 : 1);
});

grid.addEventListener("dragstart", (event) => {
  const target = event.target;
  const figure =
    target instanceof Element
      ? target.closest<HTMLElement>("[data-gallery-id]")
      : null;
  if (!figure?.dataset.galleryId || previewOnly) {
    event.preventDefault();
    return;
  }
  selectedId = figure.dataset.galleryId;
  dragStartItems = cloneItems();
  figure.dataset.dragging = "true";
  event.dataTransfer?.setData("text/plain", figure.dataset.galleryId);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
});

grid.addEventListener("dragover", (event) => {
  if (!previewOnly) {
    event.preventDefault();
  }
});

grid.addEventListener("drop", (event) => {
  event.preventDefault();
  const target = event.target;
  const targetFigure =
    target instanceof Element
      ? target.closest<HTMLElement>("[data-gallery-id]")
      : null;
  const sourceId = event.dataTransfer?.getData("text/plain");
  const targetId = targetFigure?.dataset.galleryId;
  if (!sourceId || !targetId || sourceId === targetId || !dragStartItems) {
    dragStartItems = null;
    return;
  }

  const items = cloneItems();
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  const [moved] = sourceIndex >= 0 ? items.splice(sourceIndex, 1) : [];
  if (!moved || targetIndex < 0) {
    dragStartItems = null;
    return;
  }
  pushUndo(dragStartItems);
  items.splice(targetIndex, 0, moved);
  manifest = { ...manifest, items };
  dragStartItems = null;
  render(true);
  scheduleSave();
});

grid.addEventListener("dragend", () => {
  grid.querySelectorAll<HTMLElement>("[data-dragging]").forEach((figure) => {
    delete figure.dataset.dragging;
  });
  dragStartItems = null;
});

inspector.addEventListener("focusin", (event) => {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.matches("[data-inspector-input]") &&
    !inspectorEditStart
  ) {
    inspectorEditStart = cloneItems();
  }
});

inspector.addEventListener("focusout", (event) => {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.matches("[data-inspector-input]") &&
    inspectorEditStart &&
    itemFingerprint(inspectorEditStart) !== itemFingerprint(manifest.items)
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
  }
});

inspector.querySelector("[data-inspector-close]")?.addEventListener("click", () => {
  selectedId = null;
  renderInspector();
});
inspector.querySelector("[data-gallery-remove]")?.addEventListener("click", removeSelected);
inspector.querySelectorAll<HTMLButtonElement>("[data-gallery-move]").forEach((button) => {
  button.addEventListener("click", () => {
    moveSelected(Number(button.dataset.galleryMove));
  });
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
