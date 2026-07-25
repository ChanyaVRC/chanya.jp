import type { FC } from "hono/jsx";
import { externalLinks, projects, site } from "./data/site";
import { galleryItems } from "./data/gallery";
import { buildRuntimeDocument, runtimeInitialSource } from "./runtime-policy";
import type { GalleryItem, Project } from "./types";
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

const ProjectCard: FC<{
  readonly project: Project;
  readonly featured?: boolean;
}> = ({ project, featured }) => (
  <article
    class={`${styles.projectCard} ${featured ? styles.projectCardFeatured : ""}`}
  >
    <p class={styles.meta}>{project.kind}</p>
    <h2>{project.title}</h2>
    <p>{project.description}</p>
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
  </article>
);

function gallerySource(item: GalleryItem, width: 640 | 1280, format: "avif" | "webp") {
  return `/media/gallery/${item.id}-${width}.${format}`;
}

const GalleryPicture: FC<{
  readonly item: GalleryItem;
  readonly priority: boolean;
}> = ({ item, priority }) => (
  <picture>
    <source
      type="image/avif"
      srcset={`${gallerySource(item, 640, "avif")} 640w, ${gallerySource(item, 1280, "avif")} 1280w`}
      sizes="(min-width: 60rem) 33vw, (min-width: 40rem) 50vw, 100vw"
    />
    <source
      type="image/webp"
      srcset={`${gallerySource(item, 640, "webp")} 640w, ${gallerySource(item, 1280, "webp")} 1280w`}
      sizes="(min-width: 60rem) 33vw, (min-width: 40rem) 50vw, 100vw"
    />
    <img
      src={gallerySource(item, 640, "webp")}
      alt={item.alt}
      width={item.width}
      height={item.height}
      loading={priority ? "eager" : "lazy"}
      fetchpriority={priority ? "high" : "auto"}
      decoding="async"
    />
  </picture>
);

export const HomePage: FC = () => (
  <>
    <section class={styles.heroSplit} aria-labelledby="home-title">
      <div class={styles.heroCopy} data-reveal>
        <p class={styles.meta}>Chanya Kushima · Japan</p>
        <h1 id="home-title">{site.tagline}</h1>
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

      <div class={styles.heroProof} data-reveal>
        <figure class={styles.profileFigure}>
          <ProfilePicture priority />
          <figcaption>
            <strong>九島茶にゃ</strong>
            <span>Twitterの姿</span>
          </figcaption>
        </figure>
        <figure class={styles.codeFigure}>
          <figcaption>profile.ts</figcaption>
          <pre>
            <code>{`type Chanya = {
  name: "九島茶にゃ";
  role: "`}<span class={styles.srOnly}>多分技術者</span><span aria-hidden="true" data-type-line>多分技術者</span>{`";
  location: "Japan";
};`}</code>
          </pre>
        </figure>
      </div>
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
        <GalleryPicture item={galleryItems[0]!} priority={false} />
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
  <>
    <section class={styles.pageIntro}>
      <div>
        <p class={styles.meta}>About</p>
        <h1>九島茶にゃ。</h1>
      </div>
      <p>
        Chanya Kushima。Japan。ねこ。多分技術者。ねこはかしこいのです。
      </p>
    </section>

    <section class={styles.aboutSplit}>
      <figure class={styles.aboutPortrait}>
        <ProfilePicture />
      </figure>
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
  </>
);

export const DevelopmentPage: FC = () => (
  <>
    <section class={styles.pageIntro}>
      <div>
        <p class={styles.meta}>Development</p>
        <h1>作ったもの。</h1>
      </div>
      <p>
        VRChatのOSC、ブラウザ内で完結する道具、このサイト。実装と公開先をまとめています。
      </p>
    </section>

    <section class={styles.projectGrid} aria-label="開発プロジェクト">
      {projects.map((project, index) => (
        <ProjectCard project={project} featured={index === 0} />
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

export const GalleryPage: FC = () => (
  <>
    <section class={styles.pageIntro}>
      <div>
        <p class={styles.meta}>Gallery</p>
        <h1>Nankotsu.</h1>
      </div>
      <p>
        VRChatで撮影した42枚。写真を選ぶと大きく表示します。自動では切り替わりません。
      </p>
    </section>

    <section class={styles.galleryGrid} aria-label="Nankotsuギャラリー">
      {galleryItems.map((item, index) => (
        <figure class={styles.galleryItem}>
          <button
            class={styles.galleryButton}
            type="button"
            aria-label={`${item.title}を拡大`}
            data-gallery-open
            data-gallery-src={gallerySource(item, 1280, "webp")}
            data-gallery-alt={item.alt}
            data-gallery-title={item.title}
            data-gallery-date={item.date ?? ""}
          >
            <GalleryPicture item={item} priority={index === 0} />
          </button>
          <figcaption>
            <span>{item.title}</span>
            {item.date ? <time datetime={item.date}>{item.date}</time> : null}
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
        src={gallerySource(galleryItems[0]!, 1280, "webp")}
        alt={galleryItems[0]!.alt}
        width="1280"
        height="720"
        data-lightbox-image
      />
    </dialog>
  </>
);

export const ContactPage: FC = () => {
  const contactLinks = externalLinks.filter(
    (item) => item.group === "contact" || item.group === "social",
  );

  return (
    <>
      <section class={styles.pageIntro}>
        <div>
          <p class={styles.meta}>Contact</p>
          <h1>話す場所。</h1>
        </div>
        <p>
          仕事の話と、それ以外の話でメールアドレスを分けています。内容に近い方を選んでください。
        </p>
      </section>

      <section class={styles.contactIndex} aria-label="メールアドレス">
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
      </section>

      <section class={styles.linkSection} aria-labelledby="contact-social-title">
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
    </>
  );
};

export const OtherPage: FC = () => (
  <>
    <section class={styles.pageIntro}>
      <div>
        <p class={styles.meta}>Other</p>
        <h1>外にあるもの。</h1>
      </div>
      <p>プロフィール、コミュニティ、ストア。Chanya.jpの外側へ続くリンクです。</p>
    </section>

    <section class={styles.linkSection} aria-label="外部リンク">
      <ul class={styles.linkIndex}>
        {externalLinks.map((item) => (
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
  </>
);

export const RuntimeHtmlPage: FC = () => (
  <>
    <section class={styles.toolIntro}>
      <div>
        <p class={styles.meta}>RuntimeHtml</p>
        <h1>書く。実行する。外へ出さない。</h1>
      </div>
      <p>
        HTML、CSS、JavaScriptをブラウザ内のsandboxで確認します。入力内容は送信も保存もされません。
      </p>
    </section>

    <section class={styles.runtimeGrid} aria-label="RuntimeHtmlエディター">
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
  <section class={styles.notFound}>
    <p class={styles.meta}>404</p>
    <h1>ここには何もありません。</h1>
    <p>URLを確認するか、Chanya.jpのホームへ戻ってください。</p>
    <a class={styles.primaryButtonLarge} href="/">
      Homeへ戻る
    </a>
  </section>
);
