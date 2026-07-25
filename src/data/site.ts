import type {
  CommandItem,
  ExternalLink,
  NavItem,
  PageMetadata,
  Project,
} from "../types";

const taglineLines = ["ねこ。多分", "技術者。"] as const;

export const site = {
  name: "Chanya.jp",
  ownerJa: "九島茶にゃ",
  ownerEn: "Chanya Kushima",
  tagline: taglineLines.join(""),
  taglineLines,
  description: "九島茶にゃの開発、VRChat、写真をまとめた個人サイト。",
  origin: "https://chanya.jp",
} as const;

export const primaryNav = [
  { label: "Development", href: "/development/" },
  { label: "Gallery", href: "/gallery/" },
  { label: "About", href: "/about/" },
  { label: "Other", href: "/other/" },
] as const satisfies readonly NavItem[];

export const contactNav = {
  label: "Contact",
  href: "/contact/",
} as const satisfies NavItem;

export const externalLinks = [
  {
    label: "GitHub",
    description: "コードと公開プロジェクト",
    href: "https://github.com/ChanyaVRC",
    group: "social",
  },
  {
    label: "Twitter / X",
    description: "日々の投稿",
    href: "https://twitter.com/ChanyaVRChat1",
    group: "social",
  },
  {
    label: "VRChat",
    description: "VRChatプロフィール",
    href: "https://vrchat.com/home/user/usr_9208ee3b-35c2-4911-9051-b9d808c9a8ce",
    group: "social",
  },
  {
    label: "Discord — Chanya",
    description: "個人アカウント",
    href: "https://discordapp.com/users/616907820570247178",
    group: "contact",
  },
  {
    label: "Discord — BuildSoft",
    description: "コミュニティ",
    href: "https://discord.gg/u2BE6W5NMy",
    group: "community",
  },
  {
    label: "BOOTH",
    description: "BuildSoftの頒布物",
    href: "https://buildsoft.booth.pm/",
    group: "store",
  },
  {
    label: "Steam",
    description: "Steamプロフィール",
    href: "https://steamcommunity.com/id/chanyakushima",
    group: "social",
  },
  {
    label: "Amazon",
    description: "欲しいものリスト",
    href: "https://www.amazon.jp/hz/wishlist/ls/QHXO5XRZNPIE?ref_=wl_share",
    group: "store",
  },
] as const satisfies readonly ExternalLink[];

export const projects = [
  {
    title: "VRCOscLib",
    kind: "Open-source library",
    description:
      "VRChatのOSCを.NET Standardから扱うためのライブラリ。アバターパラメーター、入力、Chatboxをコードから操作できます。",
    href: "https://github.com/ChanyaVRC/VRCOscLib",
    action: "GitHubで見る",
    external: true,
    stack: [".NET Standard", "C#", "OSC", "VRChat"],
  },
  {
    title: "RuntimeHtml",
    kind: "Browser tool",
    description:
      "入力したHTML、CSS、JavaScriptを、外部通信できないsandbox内ですぐ確認するためのローカルプレビュー。",
    href: "/products/contents/RuntimeHtml/",
    action: "ツールを開く",
    external: false,
    stack: ["TypeScript", "iframe.srcdoc", "CSP"],
  },
  {
    title: "Chanya.jp",
    kind: "Personal site",
    description:
      "開発とVRChatの記録を、Hono JSXとCloudflare Workersで配信するこのサイト。",
    href: "https://github.com/ChanyaVRC/chanya.jp",
    action: "ソースを見る",
    external: true,
    stack: ["Hono", "TypeScript", "Cloudflare Workers"],
  },
] as const satisfies readonly Project[];

export const pageMetadata = {
  home: {
    title: "Chanya.jp — 九島茶にゃ",
    description: site.description,
    path: "/",
  },
  about: {
    title: "About — Chanya.jp",
    description: "九島茶にゃ / Chanya Kushimaのプロフィール。",
    path: "/about/",
  },
  gallery: {
    title: "Gallery — Chanya.jp",
    description: "VRChatで撮影したNankotsuの記録。",
    path: "/gallery/",
  },
  development: {
    title: "Development — Chanya.jp",
    description: "VRCOscLib、RuntimeHtml、Chanya.jpの開発記録。",
    path: "/development/",
  },
  contact: {
    title: "Contact — Chanya.jp",
    description: "仕事と個人連絡の窓口。",
    path: "/contact/",
  },
  other: {
    title: "Other — Chanya.jp",
    description: "九島茶にゃの外部プロフィール、コミュニティ、ストアへのリンク。",
    path: "/other/",
  },
  runtimeHtml: {
    title: "RuntimeHtml — Chanya.jp",
    description: "HTML、CSS、JavaScriptをsandbox内で確認するブラウザツール。",
    path: "/products/contents/RuntimeHtml/",
  },
  notFound: {
    title: "404 — Chanya.jp",
    description: "ページが見つかりません。",
    path: "/404",
  },
} as const satisfies Record<string, PageMetadata>;

export const commandItems: readonly CommandItem[] = [
  { label: "Home", detail: "トップページ", href: "/", external: false },
  ...primaryNav.map((item) => ({
    label: item.label,
    detail: "Chanya.jp",
    href: item.href,
    external: false,
  })),
  {
    label: contactNav.label,
    detail: "メールとSNS",
    href: contactNav.href,
    external: false,
  },
  {
    label: "RuntimeHtml",
    detail: "sandbox HTML preview",
    href: "/products/contents/RuntimeHtml/",
    external: false,
  },
  ...externalLinks.map((item) => ({
    label: item.label,
    detail: item.description,
    href: item.href,
    external: true,
  })),
];
