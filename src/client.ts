import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./styles/site.css";

import {
  buildRuntimeDocument,
  runtimeInitialSource,
} from "./runtime-policy";

document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

function asButton(element: Element | null): HTMLButtonElement | null {
  return element instanceof HTMLButtonElement ? element : null;
}

function focusElement(element: Element | null): void {
  if (element instanceof HTMLElement) {
    element.focus();
  }
}

function initialiseHeader(): void {
  const header = document.querySelector("[data-site-header]");
  if (!(header instanceof HTMLElement)) {
    return;
  }

  let updateQueued = false;
  const updateScrolledState = (): void => {
    header.toggleAttribute("data-scrolled", window.scrollY > 8);
    updateQueued = false;
  };
  const requestUpdate = (): void => {
    if (updateQueued) {
      return;
    }

    updateQueued = true;
    window.requestAnimationFrame(updateScrolledState);
  };

  updateScrolledState();
  window.addEventListener("scroll", requestUpdate, { passive: true });
}

function initialiseMobileNavigation(): () => void {
  const toggle = asButton(document.querySelector("[data-menu-toggle]"));
  const navigation = document.querySelector("[data-mobile-nav]");

  if (!(toggle && navigation instanceof HTMLElement)) {
    return () => undefined;
  }

  const setOpen = (open: boolean, restoreFocus = false): void => {
    navigation.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    header?.toggleAttribute("data-menu-open", open);

    if (!open && restoreFocus) {
      toggle.focus();
    }
  };
  const header = toggle.closest("[data-site-header]");

  toggle.addEventListener("click", () => {
    setOpen(navigation.hasAttribute("hidden"));
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setOpen(false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !navigation.hidden) {
      event.preventDefault();
      setOpen(false, true);
    }
  });

  const desktopNavigation = window.matchMedia("(min-width: 60rem)");
  const closeAtDesktop = (event: MediaQueryListEvent): void => {
    if (event.matches) {
      setOpen(false);
    }
  };
  desktopNavigation.addEventListener("change", closeAtDesktop);

  return () => setOpen(false);
}

interface CommandPaletteElements {
  readonly dialog: HTMLDialogElement;
  readonly input: HTMLInputElement;
  readonly list: HTMLElement;
  readonly status: HTMLElement;
  readonly items: readonly HTMLElement[];
}

function getCommandPaletteElements(): CommandPaletteElements | null {
  const dialog = document.querySelector("[data-command-dialog]");
  const input = document.querySelector("[data-command-input]");
  const list = document.querySelector("[data-command-list]");
  const status = document.querySelector("[data-command-status]");

  if (
    !(dialog instanceof HTMLDialogElement) ||
    !(input instanceof HTMLInputElement) ||
    !(list instanceof HTMLElement) ||
    !(status instanceof HTMLElement)
  ) {
    return null;
  }

  const items = Array.from(
    list.querySelectorAll<HTMLElement>("[data-command-item]"),
  );

  return { dialog, input, list, status, items };
}

function normaliseSearchValue(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ja");
}

function initialiseCommandPalette(closeMobileNavigation: () => void): void {
  const elements = getCommandPaletteElements();
  if (!elements) {
    return;
  }

  const { dialog, input, list, status, items } = elements;
  const listId = list.id || "command-results";
  let selectedIndex = -1;
  let returnFocus: HTMLElement | null = null;

  list.id = listId;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", listId);
  input.setAttribute("aria-expanded", "false");

  items.forEach((item, index) => {
    item.id ||= `command-result-${String(index + 1)}`;
  });

  const visibleItems = (): readonly HTMLElement[] =>
    items.filter((item) => !item.hidden);

  const selectItem = (index: number): void => {
    const visible = visibleItems();
    selectedIndex =
      visible.length === 0
        ? -1
        : ((index % visible.length) + visible.length) % visible.length;

    for (const item of items) {
      item.setAttribute("aria-selected", "false");
    }

    const selected = visible[selectedIndex];
    if (selected) {
      selected.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", selected.id);
      selected.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  };

  const filterItems = (): void => {
    const terms = normaliseSearchValue(input.value)
      .split(/\s+/u)
      .filter(Boolean);

    for (const item of items) {
      const label = normaliseSearchValue(item.dataset.commandLabel ?? "");
      item.hidden = !terms.every((term) => label.includes(term));
    }

    const count = visibleItems().length;
    status.textContent =
      count === 0 ? "一致する項目はありません。" : `${String(count)}件の候補があります。`;
    selectItem(0);
  };

  const close = (): void => {
    if (dialog.open) {
      dialog.close();
    }
  };

  const open = (opener?: HTMLElement): void => {
    closeMobileNavigation();
    returnFocus = opener ?? (document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null);

    if (!dialog.open) {
      dialog.showModal();
    }

    input.value = "";
    input.setAttribute("aria-expanded", "true");
    filterItems();
    window.requestAnimationFrame(() => {
      input.focus();
    });
  };

  document.querySelectorAll("[data-command-open]").forEach((element) => {
    if (!(element instanceof HTMLButtonElement)) {
      return;
    }

    element.addEventListener("click", () => {
      open(element);
    });
  });

  asButton(dialog.querySelector("[data-command-close]"))?.addEventListener(
    "click",
    close,
  );

  input.addEventListener("input", filterItems);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectItem(selectedIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectItem(selectedIndex - 1);
      return;
    }

    if (event.key === "Enter") {
      const selected = visibleItems()[selectedIndex];
      const link = selected?.querySelector("a");
      if (link instanceof HTMLAnchorElement) {
        event.preventDefault();
        link.click();
      }
    }
  });

  for (const item of items) {
    item.addEventListener("pointermove", () => {
      const index = visibleItems().indexOf(item);
      if (index >= 0) {
        selectItem(index);
      }
    });

    item.querySelector("a")?.addEventListener("click", close);
  }

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      close();
    }
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  dialog.addEventListener("close", () => {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    returnFocus?.focus();
    returnFocus = null;
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key.toLocaleLowerCase("en") === "k" &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey
    ) {
      event.preventDefault();
      if (dialog.open) {
        close();
      } else {
        open();
      }
    }
  });
}

function initialiseGallery(): void {
  const dialog = document.querySelector("[data-lightbox]");
  const image = document.querySelector("[data-lightbox-image]");
  const title = document.querySelector("[data-lightbox-title]");
  const date = document.querySelector("[data-lightbox-date]");

  if (
    !(dialog instanceof HTMLDialogElement) ||
    !(image instanceof HTMLImageElement) ||
    !(title instanceof HTMLElement) ||
    !(date instanceof HTMLElement)
  ) {
    return;
  }

  const closeButton = asButton(
    dialog.querySelector("[data-lightbox-close]"),
  );
  const openButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-gallery-open]"),
  );
  let returnFocus: HTMLButtonElement | null = null;
  let currentIndex = 0;

  const showImage = (button: HTMLButtonElement): void => {
    image.src = button.dataset.gallerySrc ?? "";
    image.alt = button.dataset.galleryAlt ?? "";
    title.textContent = button.dataset.galleryTitle ?? "Nankotsu";
    date.textContent = button.dataset.galleryDate ?? "";
    currentIndex = Math.max(0, openButtons.indexOf(button));
  };

  const open = (button: HTMLButtonElement): void => {
    returnFocus = button;
    showImage(button);
    if (!dialog.open) {
      dialog.showModal();
    }
    window.requestAnimationFrame(() => {
      closeButton?.focus();
    });
  };

  const close = (): void => {
    if (dialog.open) {
      dialog.close();
    }
  };

  openButtons.forEach((button) => {
    button.addEventListener("click", () => {
      open(button);
    });
  });

  closeButton?.addEventListener("click", close);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      close();
    }
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      ((currentIndex + offset) % openButtons.length + openButtons.length) %
      openButtons.length;
    const nextButton = openButtons[nextIndex];
    if (nextButton) {
      showImage(nextButton);
    }
  });
  dialog.addEventListener("close", () => {
    returnFocus?.focus();
    returnFocus = null;
  });
}

function initialiseRuntimeHtml(): void {
  const source = document.querySelector("[data-runtime-source]");
  const frame = document.querySelector("[data-runtime-frame]");
  const status = document.querySelector("[data-runtime-status]");
  const runButton = asButton(document.querySelector("[data-runtime-run]"));
  const resetButton = asButton(document.querySelector("[data-runtime-reset]"));

  if (
    !(source instanceof HTMLTextAreaElement) ||
    !(frame instanceof HTMLIFrameElement) ||
    !(status instanceof HTMLElement) ||
    !runButton ||
    !resetButton
  ) {
    return;
  }

  const run = (): void => {
    frame.srcdoc = buildRuntimeDocument(source.value);
    status.textContent = "プレビューを更新しました。";
  };
  const reset = (): void => {
    source.value = runtimeInitialSource;
    run();
    status.textContent = "初期状態に戻し、プレビューを更新しました。";
    source.focus();
  };

  runButton.addEventListener("click", run);
  resetButton.addEventListener("click", reset);
  source.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      run();
    }
  });
}

function initialiseReveals(): void {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-reveal]"),
  );
  if (elements.length === 0) {
    return;
  }

  const reveal = (element: HTMLElement): void => {
    element.dataset.revealed = "true";
  };

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target instanceof HTMLElement) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );

  elements.forEach((element) => {
    observer.observe(element);
  });
}

function initialiseTypeLine(): void {
  const element = document.querySelector("[data-type-line]");
  if (!(element instanceof HTMLElement) || reducedMotion.matches) {
    return;
  }

  const text = element.textContent ?? "";
  if (text.length === 0) {
    return;
  }

  const characters = Array.from(text);
  let index = 0;
  element.textContent = "";

  const typeNextCharacter = (): void => {
    element.textContent = characters.slice(0, index + 1).join("");
    index += 1;

    if (index < characters.length) {
      window.setTimeout(typeNextCharacter, 72);
    }
  };

  window.setTimeout(typeNextCharacter, 240);
}

function initialise(): void {
  const closeMobileNavigation = initialiseMobileNavigation();
  initialiseHeader();
  initialiseCommandPalette(closeMobileNavigation);
  initialiseGallery();
  initialiseRuntimeHtml();
  initialiseReveals();
  initialiseTypeLine();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise, { once: true });
} else {
  initialise();
}
