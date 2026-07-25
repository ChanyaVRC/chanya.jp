# Chanya.jp

九島茶にゃ（Chanya Kushima）の開発、VRChat、写真をまとめた個人サイトです。
Hono JSXでHTMLをサーバーレンダリングし、Cloudflare WorkersとStatic Assetsから
配信します。React、PHP、DB、KV、D1、R2、CMS、フォームAPIは使用しません。

## 技術構成

- Hono + JSX（Cloudflare Worker上のSSR）
- TypeScript（strict / `noUncheckedIndexedAccess` /
  `exactOptionalPropertyTypes`）
- Vite + Cloudflare Vite plugin
- Vanilla Extract（型付きデザイントークンと静的CSS）
- DOM APIのみのクライアントTypeScript
- Vitest、Playwright、axe-core

アプリケーションコードは `.ts`、`.tsx`、`.css.ts` に統一しています。
JSONC設定、Markdown文書、画像、フォント、生成物だけが例外です。

```text
src/
├─ components/       ヘッダー、フッター、検索パレット
├─ data/             型付きの本文、リンク、ギャラリーデータ
├─ styles/           デザイントークンとVanilla Extract
├─ client.ts         検索、ギャラリー、RuntimeHtmlの操作
├─ index.tsx         HonoルートとHTTPセキュリティヘッダー
├─ pages.tsx         各ページのHono JSX
├─ renderer.tsx      HTMLシェル
└─ runtime-policy.ts RuntimeHtmlの隔離ポリシー
```

## ローカル開発

必要環境はNode.js 22.12以上です。

```sh
npm install
npm run dev
```

初回起動時を含め、`assets:build` が `media-src/` の所有画像から配信用の
AVIF / WebPを `public/media/` に生成します。`public/media/` はGit管理しません。

主要コマンド:

```sh
npm run typecheck   # TypeScript型検査
npm test            # Vitest
npm run test:e2e    # Playwright + axe（Chromiumが必要）
npm run audit:lighthouse # 起動中のlocalhost:5173を主要4ページ監査
npm run build       # 画像生成、Workers型生成、型検査、Vite build
npm run check       # Vitest + production build
npm run deploy      # build後にCloudflare Workersへデプロイ
```

Playwrightのブラウザが未導入の場合は、先に
`npx playwright install chromium` を実行してください。
Cloudflareのバインディング型は `npm run cf-typegen` で生成します。
Lighthouseは別ターミナルで`npm run dev`を起動してから実行し、4カテゴリが
各95未満なら失敗します。JSONレポートは`test-results/lighthouse/`に保存します。

## 公開ルート

| Route | 内容 |
| --- | --- |
| `/` | Home |
| `/about/` | プロフィール |
| `/gallery/` | 所有画像42作品のカタログ |
| `/development/` | VRCOscLib、RuntimeHtml、Chanya.jp |
| `/contact/` | メールとSNS |
| `/other/` | 外部リンク |
| `/products/contents/RuntimeHtml/` | ブラウザ内HTMLプレビュー |

末尾スラッシュなしの公開URLは同じURLの末尾スラッシュ付きへ308で転送します。
未定義ルートは専用404を返します。`robots.txt`、`sitemap.xml`、
`favicon.svg` もWorkerから配信します。

## セキュリティ

すべてのレスポンスにCSP、HSTS、`X-Content-Type-Options`、
`X-Frame-Options`、Permissions Policy、Referrer Policyを設定しています。
通常ページはフレームを禁止し、RuntimeHtmlページだけがローカルの
`srcdoc` プレビューを許可します。

RuntimeHtmlのiframeは `sandbox="allow-scripts"` だけを付与します。
iframe内CSPは `default-src 'none'`、`connect-src 'none'`、
`form-action 'none'` で、`unsafe-eval` を許可しません。これにより親画面、
Cookie / Storage、外部通信、フォーム、ポップアップ、トップ遷移への権限を
与えず、入力したコードはブラウザ内だけで実行されます。

## Cloudflare Workers Builds

Cloudflare Dashboardの **Workers & Pages → Create → Import a repository**
からPublic GitHubリポジトリ `ChanyaVRC/chanya.jp` を接続し、次の値を設定します。

| 設定 | 値 |
| --- | --- |
| Worker name | `chanya-jp` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| Non-production branch builds | Enabled |

依存関係のインストールはWorkers Buildsに任せ、Node.jsのビルド環境変数
`NODE_VERSION=24` を設定します。Worker設定は `wrangler.jsonc` が正です。
`main` は本番デプロイ、同一リポジトリ内の他ブランチはVersion Preview URLへの
アップロードに限定します。

外部forkのpull requestにはCloudflareの認証情報を渡しません。
GitHub Actionsはread-only権限で `npm ci`、型検査、Vitest、build、
Playwrightだけを実行します。プレビュー確認後、Cloudflareの
**Settings → Domains & Routes → Add → Custom Domain** で `chanya.jp` を
接続します。既存のMX / TXTと `www` からapexへの301は変更しません。

## ブランチ保護

GitHubのRulesetで `main` の削除とforce-pushを禁止し、pull request経由の
変更を必須にします。Required status checksにはCIの `quality` と `browser`
を指定します。

## ライセンス

ソースコードは [MIT License](LICENSE) です。`media-src/` のプロフィール・
ギャラリー画像はMITの対象外で、条件は
[ASSETS-LICENSE.md](ASSETS-LICENSE.md) に記載しています。
セルフホストするSpace Grotesk、Inter、JetBrains MonoはSIL Open Font
License 1.1です。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と
`licenses/OFL-1.1.txt` を参照してください。
