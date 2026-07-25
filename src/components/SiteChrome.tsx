import type { FC } from "hono/jsx";
import {
  commandItems,
  contactNav,
  primaryNav,
  site,
} from "../data/site";
import * as styles from "../styles/site.css";

interface HeaderProps {
  readonly currentPath: string;
}

function currentAttributes(isCurrent: boolean) {
  return isCurrent ? ({ "aria-current": "page" } as const) : {};
}

export const Header: FC<HeaderProps> = ({ currentPath }) => (
  <header class={styles.header} data-site-header>
    <div class={styles.navInner}>
      <a class={styles.wordmark} href="/" aria-label={`${site.name} ホーム`}>
        Chanya<span class={styles.wordmarkSuffix}>.jp</span>
      </a>

      <nav class={styles.desktopNav} aria-label="メインナビゲーション">
        {primaryNav.map((item) => (
          <a
            class={styles.navLink}
            href={item.href}
            {...currentAttributes(currentPath === item.href)}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div class={styles.navActions}>
        <button
          class={styles.searchButton}
          type="button"
          data-command-open
          aria-haspopup="dialog"
        >
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
        <a
          class={styles.primaryButton}
          href={contactNav.href}
          {...currentAttributes(currentPath === contactNav.href)}
        >
          Contact
        </a>
        <button
          class={styles.menuButton}
          type="button"
          aria-expanded="false"
          aria-controls="mobile-navigation"
          data-menu-toggle
        >
          Menu
        </button>
      </div>
    </div>

    <nav
      class={styles.mobileNav}
      id="mobile-navigation"
      aria-label="モバイルナビゲーション"
      hidden
      data-mobile-nav
    >
      {[{ label: "Home", href: "/" }, ...primaryNav, contactNav].map((item) => (
        <a
          class={styles.mobileNavLink}
          href={item.href}
          {...currentAttributes(currentPath === item.href)}
        >
          {item.label}
        </a>
      ))}
      <button
        class={styles.mobileSearchButton}
        type="button"
        data-command-open
        aria-haspopup="dialog"
      >
        Search <kbd>⌘K</kbd>
      </button>
    </nav>
  </header>
);

export const Footer: FC = () => (
  <footer class={styles.footer}>
    <div class={styles.footerInner}>
      <p>
        © 2021–2026 {site.ownerEn}
      </p>
      <p>{site.tagline}</p>
      <a href="https://github.com/ChanyaVRC/chanya.jp">Source ↗</a>
    </div>
  </footer>
);

export const CommandPalette: FC = () => (
  <dialog
    class={styles.commandDialog}
    id="command-palette"
    aria-labelledby="command-palette-title"
    data-command-dialog
  >
    <div class={styles.commandHeader}>
      <label id="command-palette-title" for="command-query">
        Chanya.jpを検索
      </label>
      <button
        class={styles.dialogClose}
        type="button"
        aria-label="検索を閉じる"
        data-command-close
      >
        Close
      </button>
    </div>
    <input
      class={styles.commandInput}
      id="command-query"
      type="search"
      autocomplete="off"
      placeholder="ページやリンクを入力"
      data-command-input
    />
    <p class={styles.srOnly} aria-live="polite" data-command-status />
    <ul class={styles.commandList} role="listbox" data-command-list>
      {commandItems.map((item, index) => (
        <li
          class={styles.commandItem}
          role="option"
          aria-selected={index === 0 ? "true" : "false"}
          data-command-item
          data-command-label={`${item.label} ${item.detail}`.toLocaleLowerCase(
            "ja",
          )}
        >
          <a
            href={item.href}
            {...(item.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            <span>{item.label}</span>
            <small>{item.detail}</small>
          </a>
        </li>
      ))}
    </ul>
    <p class={styles.commandHint}>
      <kbd>↑↓</kbd> 選択　<kbd>Enter</kbd> 開く　<kbd>Esc</kbd> 閉じる
    </p>
  </dialog>
);
