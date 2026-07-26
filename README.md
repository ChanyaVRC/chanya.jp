# Chanya.jp

九島茶にゃ（Chanya Kushima）の開発、VRChat、写真をまとめた個人サイトです。
Hono JSXでHTMLをサーバーレンダリングし、Cloudflare WorkersとStatic Assetsから
配信します。React、PHP、DB、KV、D1、外部CMS、フォームAPIは使用しません。
公開ページはDB不要のままです。Gallery WorkbenchだけがCloudflare Access、
R2、Images bindingを使います。

## 技術構成

- Hono + JSX（Cloudflare Worker上のSSR）
- TypeScript（strict / `noUncheckedIndexedAccess` /
  `exactOptionalPropertyTypes`）
- Vite + Cloudflare Vite plugin
- Vanilla Extract（型付きデザイントークンと静的CSS）
- DOM APIのみのクライアントTypeScript
- Cloudflare Access + R2 + Images binding（Gallery Workbench）
- Vitest、Playwright、axe-core

アプリケーションコードは `.ts`、`.tsx`、`.css.ts` に統一しています。
JSONC設定、Markdown文書、画像、フォント、生成物だけが例外です。

```text
src/
├─ components/       ヘッダー、フッター、検索パレット
├─ data/             型付きの本文、リンク、ギャラリーデータ
├─ gallery/          manifest検証、Access認証、R2版管理
├─ styles/           デザイントークンとVanilla Extract
├─ admin-client.ts   visual-first編集、取込、並べ替え、Undo、公開
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
npm run build:preview # Preview環境をbuildし、生成されたbinding設定を検証
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
| `/admin/gallery/` | Access保護されたGallery Workbench |
| `/development/` | VRCOscLib、RuntimeHtml、Chanya.jp |
| `/contact/` | メールとSNS |
| `/other/` | 外部リンク |
| `/products/contents/RuntimeHtml/` | ブラウザ内HTMLプレビュー |

末尾スラッシュなしの公開URLは同じURLの末尾スラッシュ付きへ308で転送します。
未定義ルートは専用404を返します。`robots.txt`、`sitemap.xml`、
`favicon.svg` もWorkerから配信します。

## Gallery Workbench

`/admin/gallery/` は公開Galleryと同じ `GalleryCanvas` を使います。写真を直接
選択し、順序、standard / wide / feature、タイトル、撮影日、alt、焦点位置を
編集できます。VRChat画像フォルダは `showDirectoryPicker()` で選択し、未対応
ブラウザではdirectory file inputへフォールバックします。選択直後はローカル
previewを出し、JPEG / PNG / WebPだけを1枚20MB・50MP以下でR2へ送信します。

下書きは700msで自動保存され、手動保存、Undo、キーボード移動、
競合時rollbackにも対応します。「公開する」で検証済みdraft manifestを
published manifestへ切り替えます。両方は `manifests/state.json` にまとめて
条件付きで原子的に更新するため、保存と公開が重なっても古い下書きを公開しません。
管理画面から外した画像はR2から削除しません。

既存42枚はGit管理のseed manifestとしてそのまま使えます。R2が空でも公開Gallery
は表示され、初回の下書き保存からR2管理が始まります。新規画像の原本は
`assets/<uuid>` に非公開で保存し、公開URLはImages bindingが生成する
640 / 1280 / 1920pxのAVIF / WebPだけです。下書き画像のpreviewはAccess配下の
専用URLを使い、公開manifestへ入るまでは公開画像URLから取得できません。UUIDは
ブラウザ側で先に決めるため、upload応答が途切れても同じobjectへ安全に再送します。
公開変換画像はETag付きで毎回所属を再検証し、公開から外した後に長期cacheだけが
残ることも避けています。

### 本番準備

1. [R2 bucketの作成手順](https://developers.cloudflare.com/r2/buckets/create-buckets/)
   を開き、bucketを一度だけ作成します。

   ```sh
   npx wrangler r2 bucket create chanya-gallery
   ```

2. [GitHub OAuth Apps](https://github.com/settings/developers) の
   **Settings → Developer settings → OAuth Apps** で
   `Chanya Gallery Admin` を作成します。入力項目の詳細は
   [GitHub公式の作成手順](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
   でも確認できます。

   - Homepage URL:
     `https://<team-name>.cloudflareaccess.com`
   - Authorization callback URL:
     `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`

3. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) の
   **Integrations → Identity providers** へGitHubを追加し、OAuth Appの
   Client ID / Client secretを入力します。設定値と画面操作は
   [GitHub IdPの公式手順](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/github/)
   に沿います。
   `Finish setup` と `Test` まで完了させます。Client secretはCloudflareだけに
   保存し、リポジトリ、`.dev.vars`、`wrangler.jsonc` には入れません。

4. [AccessのSelf-hosted application作成手順](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
   に沿って `chanya.jp/admin/gallery*` を保護し、Login methodをGitHubだけにして
   **Auto redirect to identity** を有効にします。Allow policyは
   [Access policyの公式手順](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
   に沿って、管理者のGitHub primary emailをIncludeし、
   Login Methods = GitHubもRequireします。

5. [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
   を参照し、`wrangler.jsonc` の `CF_ACCESS_TEAM_DOMAIN` と
   `CF_ACCESS_AUD` を実値へ置き換えます。`GALLERY_ADMIN_EMAIL` は
   GitHubがAccessへ返すprimary emailを
   [Worker Secret](https://developers.cloudflare.com/workers/configuration/secrets/)
   として対話入力し、リポジトリには保存しません。

   ```sh
   npx wrangler secret put GALLERY_ADMIN_EMAIL
   ```

   設定後に
   [`npm run deploy`](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy)
   します。

本番のtop-level設定では `workers_dev` とPreview URLを管理境界の迂回防止のため
無効にしています。`env.preview` だけがAccess保護されたVersion Preview URLを
有効にします。ローカルの `http://localhost` だけはproduction buildに含まれない
開発用bypassを使います。必要なら `.dev.vars.example` を `.dev.vars` へコピーして
設定してください。

## セキュリティ

すべてのレスポンスにCSP、HSTS、`X-Content-Type-Options`、
`X-Frame-Options`、Permissions Policy、Referrer Policyを設定しています。
通常ページはフレームを禁止し、RuntimeHtmlページだけがローカルの
`srcdoc` プレビューを許可します。

RuntimeHtmlのiframeは `sandbox="allow-scripts"` だけを付与します。
iframe内CSPは `default-src 'none'`、`connect-src 'none'`、
`form-action 'none'` で、`unsafe-eval` を許可しません。これにより親画面、
Cookie / Storage、外部通信、フォーム、ポップアップ、トップ遷移への権限を
与えず、入力したコードはブラウザ内だけで実行されます。RuntimeHtmlのHTML応答は
`Cache-Control: no-transform` とし、CDNによるAnalytics script注入も止めます。

Gallery WorkbenchはGitHub IdPだけを許可したCloudflare Accessを使い、Access JWTを
Workerでも再検証して管理者emailを固定します。更新要求は同一Origin、
custom header、SameSite CSRF cookieを必須にし、管理HTML/APIは
`private, no-store` と `noindex` を返します。画像はmagic bytesとImages bindingの
decode結果を検証し、ローカルファイル名やJWTをログへ残しません。

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
アップロードに限定します。Preview versionは本番と同じ `chanya-jp` Worker上で
動きますが、`chanya-gallery-preview` R2 bucketへbindingするため、本番の下書き・
公開manifest・画像を変更しません。Worker名を共通にするため、設定済みのWorker
Secretはそのまま使えます。初回だけPreview用bucketを作成します。

```sh
npx wrangler r2 bucket create chanya-gallery-preview
```

Preview URLを初めて使うときは、Cloudflare Dashboardの
**Workers & Pages → chanya-jp → Settings → Domains & Routes → Preview URLs**
で **Enable Cloudflare Access** を選びます。続けて
**Manage Cloudflare Access** から対象applicationを開き、本番と同じAllow policy
（Include = 管理者のGitHub primary email、Require = Login Methods / GitHub）を
割り当て、利用できるLogin methodをGitHubだけにします。

対象applicationに表示される **Application Audience (AUD) tag** と
`wrangler.jsonc` のtop-level `CF_ACCESS_AUD` を比較します。現在のように同じなら
変更不要です。異なる場合だけ、production側の値は変更せず
`env.preview.vars.CF_ACCESS_AUD` をPreview applicationのAUDへ変更します。

設定確認にはBranch Preview URLを使います。未ログイン状態で次を実行すると
Cloudflare Accessへの `302` と `Location` headerが返り、そのURLをブラウザで開いて
GitHubログイン後にGallery Workbenchが表示されれば完了です。

```sh
curl -I https://<branch>-chanya-jp.<workers-subdomain>.workers.dev/admin/gallery/
npm run build:preview
```

`build:preview` は生成された `dist/chanya_jp/wrangler.json` を検査し、Worker名、
`targetEnvironment`、Preview URL設定、R2 bucket、`GALLERY_ENVIRONMENT` のどれかが
Preview用でなければ失敗します。

Cloudflare Vite pluginはenvironmentをbuild時に確定します。Workers Buildsでは
`WORKERS_CI_BRANCH`を見て、`main`以外なら自動的に `preview` environmentでbuild
します。ローカルから手動でVersion Previewを作る場合は次を使います。

```sh
npm run upload:preview
```

top-level設定で誤って作られたVersion Previewは防御的にread-onlyとなり、
`chanya.jp`以外のhostから本番Galleryへ書き込めません。

外部forkのpull requestにはCloudflareの認証情報を渡しません。
GitHub Actionsはread-only権限で `npm ci`、型検査、Vitest、production / preview
build、生成されたPreview binding設定の検査、Playwrightだけを実行します。

本番は既存のproxied A / AAAAを保持したまま `chanya.jp/*` のWorker Routeで
配信します。Custom Domainへ移行する場合は、MX / TXTと `www` のレコードを
残し、apexの外部管理A / AAAAだけを削除してから
`routes` を `{ "pattern": "chanya.jp", "custom_domain": true }` に変更します。
既存の `www` からapexへの301は変更しません。

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
