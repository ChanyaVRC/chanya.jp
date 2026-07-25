import type { FC } from "hono/jsx";
import { externalLinks, projects, site } from "./data/site";
import {
  seedGalleryManifest,
  type GalleryManifest,
  type GalleryManifestItem,
} from "./gallery/manifest";
import { buildRuntimeDocument, runtimeInitialSource } from "./runtime-policy";
import type { Project } from "./types";
import * as styles from "./styles/site.css";

const externalAttributes = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

const Arrow = () => <span aria-hidden="true">↗</span>;

const ProfilePicture: FC<{ readonly priority?: boolean }> = ({ priority }) => (
  <picture>
    <source srcset="/media/profile/profile-400.avif" type="image/avif" />
    <source srcset="/media/profile/profile-400.webp" type="image/webp" />
    <img
      src="/media/profile/profile-400.webp"
      alt="赤い髪のVRChatアバター、九島茶にゃ"
      width="400"
      height="400"
      loading={priority ? "eager" : "lazy"}
      fetchpriority={priority ? "high" : "auto"}
    />
  </picture>
);

const ProjectRecord: FC<{
  readonly project: Project;
}> = ({ project }) => (
  <article class={styles.projectRecord}>
    <div class={styles.projectIdentity}>
      <p class={styles.meta}>{project.kind}</p>
      <h2>{project.title}</h2>
    </div>
    <p class={styles.projectDescription}>{project.description}</p>
    <div class={styles.projectDestination}>
      <ul class={styles.tagList} aria-label={`${project.title}の技術`}>
        {project.stack.map((item) => (
          <li>{item}</li>
        ))}
      </ul>
      <a
        class={styles.textLink}
        href={project.href}
        {...(project.external ? externalAttributes : {})}
      >
        {project.action} <Arrow />
      </a>
    </div>
  </article>
);

function gallerySource(
  item: GalleryManifestItem,
  width: 640 | 1280 | 1920,
  format: "avif" | "webp",
  admin: boolean,
) {
  if (item.source.kind === "static") {
    return `/media/gallery/${item.source.id}-${width === 1920 ? 1280 : width}.${format}`;
  }

  const prefix = admin ? "/admin/gallery/media" : "/media/gallery-managed";
  return `${prefix}/${encodeURIComponent(item.source.key)}/${String(width)}.${format}`;
}

function gallerySrcset(
  item: GalleryManifestItem,
  format: "avif" | "webp",
  admin: boolean,
): string {
  const widths: readonly (640 | 1280 | 1920)[] =
    item.source.kind === "managed" ? [640, 1280, 1920] : [640, 1280];

  return widths
    .map((width) => `${gallerySource(item, width, format, admin)} ${String(width)}w`)
    .join(", ");
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

const GalleryPicture: FC<{
  readonly item: GalleryManifestItem;
  readonly priority: boolean;
  readonly admin: boolean;
}> = ({ item, priority, admin }) => (
  <picture>
    <source
      type="image/avif"
      srcset={gallerySrcset(item, "avif", admin)}
      sizes={gallerySizes(item)}
    />
    <source
      type="image/webp"
      srcset={gallerySrcset(item, "webp", admin)}
      sizes={gallerySizes(item)}
    />
    <img
      src={gallerySource(item, 640, "webp", admin)}
      alt={item.alt}
      width={item.width}
      height={item.height}
      loading={priority ? "eager" : "lazy"}
      fetchpriority={priority ? "high" : "auto"}
      decoding="async"
      style={{
        objectPosition: `${String(item.focalPoint.x * 100)}% ${String(item.focalPoint.y * 100)}%`,
      }}
    />
  </picture>
);

const initialGalleryManifest = seedGalleryManifest();

export const HomePage: FC = () => (
  <>
    <section class={styles.heroSplit} aria-labelledby="home-title">
      <div class={styles.heroCopy} data-home-copy data-reveal>
        <p class={styles.meta}>Chanya Kushima · Japan</p>
        <h1 id="home-title" aria-label={site.tagline}>
          {site.taglineLines.map((line) => (
            <span>{line}</span>
          ))}
        </h1>
        <p class={styles.heroLede}>
          九島茶にゃの開発、VRChat、写真。作ったものと、見つけた景色を同じ場所に置いています。
        </p>
        <div class={styles.actionRow}>
          <a class={styles.primaryButtonLarge} href="/development/">
            制作を見る
          </a>
          <a class={styles.secondaryButton} href="/contact/">
            連絡する
          </a>
        </div>
      </div>

      <figure
        class={styles.profileFigure}
        data-profile-photo
        data-reveal
      >
        <ProfilePicture priority />
        <figcaption>
          <strong>九島茶にゃ</strong>
          <span>プロフィールアイコン</span>
        </figcaption>
      </figure>
    </section>

    <section class={styles.darkBand} aria-labelledby="current-work-title">
      <div>
        <h2 id="current-work-title">コードとVRChatの間。</h2>
        <p>
          OSCライブラリを作り、ブラウザの小さな道具を整え、VRChatで撮った記録を残しています。
        </p>
      </div>
      <nav aria-label="注目コンテンツ">
        <a href="/development/">Development <span>→</span></a>
        <a href="/gallery/">Gallery <span>→</span></a>
      </nav>
    </section>

    <section class={styles.splitSection} aria-labelledby="vrcosclib-title">
      <div class={styles.splitCopy}>
        <h2 id="vrcosclib-title">VRCOscLib</h2>
        <p>
          VRChatのOSCを.NET Standardから扱うライブラリ。アバターパラメーター、入力、Chatboxをコードから操作できます。
        </p>
        <a
          class={styles.textLink}
          href="https://github.com/ChanyaVRC/VRCOscLib"
          {...externalAttributes}
        >
          GitHubでコードを見る <Arrow />
        </a>
      </div>
      <figure class={styles.plainCode}>
        <figcaption>avatar-parameter.cs</figcaption>
        <pre>
          <code>{`var avatar =
  await OscAvatarConfig.WaitAndCreateAtCurrentAsync();

avatar.Parameters["Wave"] = true;`}</code>
        </pre>
      </figure>
    </section>

    <section
      class={`${styles.splitSection} ${styles.splitSectionReverse}`}
      aria-labelledby="gallery-preview-title"
    >
      <figure class={styles.featureImage}>
        <GalleryPicture
          item={initialGalleryManifest.items[0]!}
          priority={false}
          admin={false}
        />
      </figure>
      <div class={styles.splitCopy}>
        <h2 id="gallery-preview-title">Nankotsu</h2>
        <p>2020年にVRChatで撮影した42枚。自動再生ではなく、自分の速さで見られるカタログです。</p>
        <a class={styles.textLink} href="/gallery/">
          すべての写真を見る <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  </>
);

export const AboutPage: FC = () => (
  <section class={styles.aboutProfile} data-page-layout="about">
    <figure class={styles.aboutPortrait} data-primary-content>
      <ProfilePicture />
      <figcaption>Chanya Kushima · Japan</figcaption>
    </figure>

    <div class={styles.aboutLead}>
      <div>
        <p class={styles.meta}>About</p>
        <h1>九島茶にゃ。</h1>
      </div>
      <p class={styles.aboutStatement}>
        Chanya Kushima。Japan。ねこ。多分技術者。ねこはかしこいのです。
      </p>
    </div>

    <div class={styles.profileDetails}>
      <dl>
        <div>
          <dt>Name / ja</dt>
          <dd>九島茶にゃ</dd>
        </div>
        <div>
          <dt>Name / en</dt>
          <dd>Chanya Kushima</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>Japan</dd>
        </div>
      </dl>
      <p>
        このサイトには、公開している開発プロジェクトとVRChatで撮影した記録をまとめています。
      </p>
      <div class={styles.actionRow}>
        <a class={styles.secondaryButton} href="/development/">
          Development
        </a>
        <a class={styles.secondaryButton} href="/gallery/">
          Gallery
        </a>
      </div>
    </div>
  </section>
);

export const DevelopmentPage: FC = () => (
  <>
    <section
      class={styles.developmentMasthead}
      data-page-layout="development"
    >
      <div class={styles.compactHeading}>
        <p class={styles.meta}>Development</p>
        <h1>作ったもの。</h1>
      </div>
      <p class={styles.developmentLede}>
        VRChatのOSC、ブラウザ内で完結する道具、このサイト。実装と公開先をまとめています。
      </p>
      <p class={styles.projectCount}>
        <strong>03</strong>
        <span>published projects</span>
      </p>
    </section>

    <section
      class={styles.projectIndex}
      aria-label="開発プロジェクト"
      data-primary-content
    >
      {projects.map((project) => (
        <ProjectRecord project={project} />
      ))}
    </section>

    <section class={styles.codeBand} aria-labelledby="vrcosclib-code-title">
      <div>
        <p class={styles.metaOnDark}>VRCOscLib</p>
        <h2 id="vrcosclib-code-title">Avatar parameters from C#.</h2>
        <p>
          NuGetパッケージを読み込み、現在のアバター設定を取得してOSCパラメーターを送ります。
        </p>
      </div>
      <pre>
        <code>{`using BuildSoft.VRChat.Osc.Avatar;

var avatar =
  await OscAvatarConfig.WaitAndCreateAtCurrentAsync();

avatar.Parameters["BoolParameterName"] = true;`}</code>
      </pre>
    </section>
  </>
);

function galleryLayoutClass(item: GalleryManifestItem): string {
  if (item.layout === "feature") {
    return styles.galleryItemFeature;
  }

  return item.layout === "wide" ? styles.galleryItemWide : "";
}

function galleryCapturedLabel(items: readonly GalleryManifestItem[]): string {
  const years = Array.from(
    new Set(
      items
        .map((item) => item.date?.slice(0, 4))
        .filter((year): year is string => Boolean(year)),
    ),
  ).sort();

  if (years.length === 0) {
    return "—";
  }

  return years.length === 1 ? years[0]! : `${years[0]}–${years.at(-1)}`;
}

interface GalleryCanvasProps {
  readonly manifest: GalleryManifest;
  readonly mode?: "view" | "editor";
}

export const GalleryCanvas: FC<GalleryCanvasProps> = ({
  manifest,
  mode = "view",
}) => {
  const editor = mode === "editor";
  const firstItem = manifest.items[0] ?? initialGalleryManifest.items[0]!;

  return (
    <>
      <section class={styles.galleryMasthead} data-page-layout="gallery">
        <div class={styles.compactHeading}>
          <p class={styles.meta}>Gallery</p>
          <h1>Nankotsu.</h1>
        </div>
        <p class={styles.galleryLede}>
          VRChatで撮影した{String(manifest.items.length)}枚。写真を選ぶと大きく表示します。
          自動では切り替わりません。
        </p>
        <dl class={styles.galleryFacts}>
          <div>
            <dt>Works</dt>
            <dd data-gallery-count>{String(manifest.items.length)}</dd>
          </div>
          <div>
            <dt>Captured</dt>
            <dd data-gallery-years>{galleryCapturedLabel(manifest.items)}</dd>
          </div>
        </dl>
      </section>

      <section
        class={styles.galleryGrid}
        aria-label={editor ? "Nankotsuギャラリー編集キャンバス" : "Nankotsuギャラリー"}
        data-gallery-grid
        data-primary-content
      >
        {manifest.items.map((item, index) => (
          <figure
            class={`${styles.galleryItem} ${galleryLayoutClass(item)} ${editor ? styles.galleryEditable : ""}`}
            data-gallery-id={item.id}
            data-layout={item.layout}
          >
            <button
              class={`${styles.galleryButton} ${editor ? styles.galleryEditorButton : ""}`}
              type="button"
              aria-label={editor ? `${item.title}を編集` : `${item.title}を拡大`}
              aria-pressed={editor ? "false" : undefined}
              draggable={editor}
              data-gallery-open={editor ? undefined : ""}
              data-gallery-select={editor ? "" : undefined}
              data-gallery-src={gallerySource(item, 1920, "webp", editor)}
              data-gallery-alt={item.alt}
              data-gallery-title={item.title}
              data-gallery-date={item.date ?? ""}
              data-gallery-width={String(item.width)}
              data-gallery-height={String(item.height)}
            >
              {editor ? (
                <span class={styles.galleryOrderBadge} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              ) : null}
              <GalleryPicture
                item={item}
                priority={index === 0}
                admin={editor}
              />
            </button>
            <figcaption>
              <span data-gallery-caption-title>{item.title}</span>
              {item.date ? (
                <time datetime={item.date} data-gallery-caption-date>
                  {item.date}
                </time>
              ) : (
                <time hidden data-gallery-caption-date />
              )}
            </figcaption>
          </figure>
        ))}
      </section>

      <dialog
        class={styles.lightboxDialog}
        aria-labelledby="lightbox-title"
        data-lightbox
      >
        <div class={styles.lightboxTopbar}>
          <div>
            <strong id="lightbox-title" data-lightbox-title>
              Nankotsu
            </strong>
            <span data-lightbox-date />
          </div>
          <button type="button" data-lightbox-close>
            Close
          </button>
        </div>
        <img
          src={gallerySource(firstItem, 1920, "webp", editor)}
          alt={firstItem.alt}
          width={String(firstItem.width)}
          height={String(firstItem.height)}
          data-lightbox-image
        />
      </dialog>
    </>
  );
};

export const GalleryPage: FC<{ readonly manifest?: GalleryManifest }> = ({
  manifest = initialGalleryManifest,
}) => <GalleryCanvas manifest={manifest} />;

interface AdminGalleryPageProps {
  readonly manifest: GalleryManifest;
  readonly actor: string;
  readonly csrfToken: string;
}

function serialiseBootstrap(value: object): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export const AdminGalleryPage: FC<AdminGalleryPageProps> = ({
  manifest,
  actor,
  csrfToken,
}) => (
  <div
    data-gallery-admin
    data-preview="false"
    data-manifest-version={String(manifest.version)}
  >
    <section class={styles.adminToolbar} aria-label="ギャラリー管理">
      <div class={styles.adminToolbarInner}>
        <div class={styles.adminIdentity}>
          <strong>Gallery Workbench</strong>
          <span>GitHub Access · {actor}</span>
        </div>
        <div class={styles.adminToolbarActions} data-gallery-toolbar-actions>
          <span
            class={styles.adminStatus}
            data-gallery-status
            data-state="saved"
            role="status"
            aria-live="polite"
          >
            下書きは同期済み
          </span>
          <button
            class={styles.adminButton}
            type="button"
            data-gallery-import
          >
            フォルダを選ぶ
          </button>
          <button
            class={styles.adminButton}
            type="button"
            data-gallery-undo
            disabled
          >
            元に戻す
          </button>
          <button
            class={styles.adminButton}
            type="button"
            aria-pressed="false"
            data-gallery-preview
          >
            表示だけ
          </button>
          <button
            class={styles.adminButton}
            type="button"
            data-gallery-save
          >
            下書き保存
          </button>
          <button
            class={styles.adminPrimaryButton}
            type="button"
            data-gallery-publish
          >
            公開する
          </button>
          <a
            class={styles.adminButton}
            href="/cdn-cgi/access/logout"
            data-gallery-logout
          >
            ログアウト
          </a>
        </div>
      </div>
    </section>

    <input
      class={styles.srOnly}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      aria-label="VRChat画像フォルダ"
      multiple
      webkitdirectory
      data-gallery-folder-input
    />

    <GalleryCanvas manifest={manifest} mode="editor" />

    <aside
      class={styles.adminInspector}
      data-gallery-inspector
      data-open="false"
      aria-hidden="true"
      aria-label="写真の編集"
    >
      <header class={styles.adminInspectorHeader}>
        <div>
          <strong data-inspector-title>写真を選択</strong>
          <span data-inspector-position>— / {String(manifest.items.length)}</span>
        </div>
        <button
          class={styles.adminButton}
          type="button"
          data-inspector-close
        >
          閉じる
        </button>
      </header>
      <div class={styles.adminInspectorBody}>
        <label class={styles.adminField}>
          タイトル
          <input
            type="text"
            maxLength={120}
            autoComplete="off"
            data-inspector-input="title"
          />
        </label>
        <label class={styles.adminField}>
          撮影日
          <input type="date" data-inspector-input="date" />
        </label>
        <label class={styles.adminField}>
          代替テキスト
          <textarea
            maxLength={300}
            rows={4}
            data-inspector-input="alt"
          />
        </label>
        <label class={styles.adminField}>
          表示サイズ
          <select data-inspector-input="layout">
            <option value="standard">標準</option>
            <option value="wide">横長</option>
            <option value="feature">大きく見せる</option>
          </select>
        </label>
        <div class={styles.adminFieldRow}>
          <label class={styles.adminField}>
            焦点・横
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              data-inspector-input="focal-x"
            />
          </label>
          <label class={styles.adminField}>
            焦点・縦
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              data-inspector-input="focal-y"
            />
          </label>
        </div>
        <div class={styles.adminInspectorActions}>
          <button
            class={styles.adminButton}
            type="button"
            data-gallery-move="-1"
          >
            前へ移動
          </button>
          <button
            class={styles.adminButton}
            type="button"
            data-gallery-move="1"
          >
            後へ移動
          </button>
          <button
            class={styles.adminButton}
            type="button"
            data-gallery-remove
          >
            下書きから外す
          </button>
          <a class={styles.adminButton} href="/gallery/" target="_blank">
            公開ページ
          </a>
        </div>
      </div>
    </aside>

    <p
      class={styles.adminToast}
      data-gallery-toast
      data-open="false"
      role="status"
      aria-live="polite"
    />
    <script
      type="application/json"
      data-gallery-bootstrap
      dangerouslySetInnerHTML={{
        __html: serialiseBootstrap({ manifest, actor, csrfToken }),
      }}
    />
  </div>
);

export const ContactPage: FC = () => {
  const contactLinks = externalLinks.filter(
    (item) => item.group === "contact" || item.group === "social",
  );

  return (
    <section class={styles.directoryLayout} data-page-layout="contact">
      <header class={styles.directoryHeader}>
        <div class={styles.compactHeading}>
          <p class={styles.meta}>Contact</p>
          <h1>話す場所。</h1>
        </div>
        <p>
          仕事の話と、それ以外の話でメールアドレスを分けています。内容に近い方を選んでください。
        </p>
      </header>

      <div class={styles.directoryBody} data-primary-content>
        <section
          class={styles.directoryGroup}
          aria-labelledby="contact-email-title"
        >
          <h2 id="contact-email-title">Email</h2>
          <div class={styles.contactIndex} aria-label="メールアドレス">
            <a href="mailto:work@chanya.jp">
              <span>Work</span>
              <strong>work@chanya.jp</strong>
              <span aria-hidden="true">↗</span>
            </a>
            <a href="mailto:any@chanya.jp">
              <span>Other</span>
              <strong>any@chanya.jp</strong>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section
          class={styles.directoryGroup}
          aria-labelledby="contact-social-title"
        >
          <h2 id="contact-social-title">Social</h2>
          <ul class={styles.linkIndex}>
            {contactLinks.map((item) => (
              <li>
                <a href={item.href} {...externalAttributes}>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <Arrow />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
};

const otherLinkGroups = [
  { key: "social", label: "Profiles" },
  { key: "contact", label: "Contact" },
  { key: "community", label: "Community" },
  { key: "store", label: "Store" },
] as const;

export const OtherPage: FC = () => (
  <section class={styles.directoryLayout} data-page-layout="other">
    <header class={styles.directoryHeader}>
      <div class={styles.compactHeading}>
        <p class={styles.meta}>Other</p>
        <h1>外にあるもの。</h1>
      </div>
      <p>プロフィール、コミュニティ、ストア。Chanya.jpの外側へ続くリンクです。</p>
    </header>

    <div
      class={`${styles.directoryBody} ${styles.otherDirectory}`}
      data-primary-content
    >
      {otherLinkGroups.map((group) => {
        const items = externalLinks.filter((item) => item.group === group.key);

        return (
          <section
            class={styles.directoryGroup}
            aria-labelledby={`other-${group.key}-title`}
          >
            <h2 id={`other-${group.key}-title`}>{group.label}</h2>
            <ul class={styles.linkIndex}>
              {items.map((item) => (
                <li>
                  <a href={item.href} {...externalAttributes}>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <Arrow />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  </section>
);

export const RuntimeHtmlPage: FC = () => (
  <>
    <section class={styles.toolMasthead} data-page-layout="runtime-html">
      <div class={styles.compactHeading}>
        <p class={styles.meta}>RuntimeHtml</p>
        <h1>書く。実行する。外へ出さない。</h1>
      </div>
      <p class={styles.toolLede}>
        HTML、CSS、JavaScriptをブラウザ内のsandboxで確認します。入力内容は送信も保存もされません。
      </p>
      <dl class={styles.toolFacts}>
        <div>
          <dt>Execution</dt>
          <dd>Browser sandbox</dd>
        </div>
        <div>
          <dt>Storage</dt>
          <dd>None</dd>
        </div>
      </dl>
    </section>

    <section
      class={styles.runtimeGrid}
      aria-label="RuntimeHtmlエディター"
      data-primary-content
    >
      <div class={styles.editorPane}>
        <div class={styles.toolBar}>
          <label for="runtime-source">HTML / CSS / JavaScript</label>
          <div>
            <button type="button" data-runtime-reset>
              初期化
            </button>
            <button type="button" data-runtime-run>
              実行
            </button>
          </div>
        </div>
        <textarea
          id="runtime-source"
          class={styles.runtimeTextarea}
          spellcheck={false}
          data-runtime-source
        >
          {runtimeInitialSource}
        </textarea>
        <p class={styles.toolStatus} aria-live="polite" data-runtime-status>
          ローカルプレビュー。Cmd/Ctrl + Enterでも実行できます。
        </p>
      </div>

      <div class={styles.previewPane}>
        <p>Sandbox preview</p>
        <iframe
          title="RuntimeHtmlプレビュー"
          sandbox="allow-scripts"
          referrerpolicy="no-referrer"
          srcdoc={buildRuntimeDocument(runtimeInitialSource)}
          data-runtime-frame
        />
      </div>
    </section>

    <aside class={styles.securityNote}>
      <h2>このpreviewが許可するもの</h2>
      <p>
        inlineのHTML、CSS、JavaScriptだけを実行します。外部通信、フォーム送信、親ページのDOM・Cookie・Storageへのアクセスはできません。
      </p>
    </aside>
  </>
);

export const NotFoundPage: FC = () => (
  <section class={styles.notFound} data-page-layout="not-found">
    <div>
      <p class={styles.meta}>404</p>
      <h1>ここには何もありません。</h1>
      <p>URLを確認するか、Chanya.jpのホームへ戻ってください。</p>
      <a class={styles.primaryButtonLarge} href="/">
        Homeへ戻る
      </a>
    </div>
  </section>
);
