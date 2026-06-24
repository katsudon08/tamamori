# CLAUDE.md

たま森（tamamori）の開発ガイド。Claude Code が毎セッション参照する土台。
詳細仕様は `docs/` を正とし、ここでは要点と参照先のみを記す。

## 1. 概要

たま森は、Slack上のチームの活動（発言・リアクション・感謝など）を内部の活動イベントへ変換し、ユーザーごとの「盆栽」の状態を更新・可視化するサービス。

→ 詳細: `docs/requirements.md`

## 2. アーキテクチャ

**目標構成**（北極星）: フロントエンドとバックエンドを分離したモノレポ。

- `apps/web` — React / Vercel。画面表示に専念。初期表示はHTTP API、状態更新はWebSocketで受信。
- `apps/api` — Hono + Slack Bolt / Cloud Run。HTTP API・Slack Webhook受信・活動イベント変換・盆栽状態計算・WebSocket配信を担当。
- データストア: PostgreSQL。`apps/api` のみがDBへアクセスする。

→ 詳細: `docs/architecture-design.md` / `docs/adr/`

### 現在地（移行中）

実コードはまだ目標構成に到達していない。**現状は `src/` 配下の Next.js 16 フルスタック構成**（FSDレイヤー）であり、そこから `apps/web`＋`apps/api` モノレポへ移行している途中である。

- 実装・修正は原則として現行コード（`src/`）に対して行う。
- ディレクトリ構造を新設する判断が必要な場合は、目標構成に近づける方向で検討し、ユーザーに確認する。

## 3. ディレクトリと FSD

現行コードは Feature-Sliced Design に従う（`eslint-plugin-fsd-lint` で境界を強制）。

レイヤー（上位→下位、import は下位方向のみ許可）:

```
app       … src/app       ルーティング・providers・API route。薄く保つ。
widgets   … src/widgets   ページを構成するUIブロック
features  … src/features  ユーザー操作・ユースケース
entities  … src/entities  ドメインモデル（bonsai / user / action）
shared    … src/shared    汎用UI・lib・config（最下層）
```

- 各スライスは `index.ts` を公開APIとし、外部からは `index.ts` 経由でのみ参照する（内部実装へ直接 import しない）。
- スライス内部は `ui` / `model` / `lib` / `api` で構成する。

## 4. 開発コマンド

| 目的 | コマンド |
|---|---|
| 開発サーバ | `npm run dev` |
| ビルド | `npm run build` |
| Lint | `npm run lint` |
| 整形 / チェック | `npm run format` / `npm run format:check` |
| 単体テスト | `npm test` |
| E2Eテスト | `npm run test:e2e` |
| Storybook | `npm run storybook` |
| Supabase型生成 | `npm run gen:types` |

## 5. ルール

### FSD 依存規則

- import はレイヤーの下位方向のみ。上位・同位への依存を作らない。
- スライス外からは公開API（`index.ts`）経由でのみ参照する。
- `app` 層は薄く保つ。ロジックは features / entities に委譲し、`app`（pages含む）に純粋関数やドメインロジックを置かない。

### コミット規約

- 日本語の Conventional Commits: `type(scope): 説明 (#issue)`
- type 例: `feat` `fix` `docs` `test` `refactor` `chore`
- 本文（body）は必須。件名の後に空行を1行挟み、変更の理由（なぜ）と概要を記述する（件名のみのコミットは作らない）。
- 作者トレーラ（`Co-Authored-By` 等）は付与しない。

### ブランチ・PR

- ブランチ名: `type/<issue番号>-<kebab>`（issue が無ければ `type/<kebab>`）
- PRのベースは当面 `main`（`develop` 不在のため。再作成時は `develop` へ戻す）。

### Issue / ラベル

- `layer:*` ラベルは単一のみ付ける。複数レイヤーに跨る場合は最も影響の大きい層を選ぶ。
- ラベルは手動で付与する（git / gh 操作で自動付与しない）。

### 禁止事項

- フロント（`apps/web`）から DB へ直接アクセスしない。DBアクセスは `apps/api` のみ。
- 投稿本文や会話履歴は保存しない。

## 6. ドキュメント索引

- `docs/requirements.md` — 要件定義
- `docs/architecture-design.md` — アーキテクチャ設計
- `docs/api-design.md` — API設計
- `docs/database-design.md` — DB設計
- `docs/adr/` — アーキテクチャ決定記録（ADR）
