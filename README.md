# たま森（tamamori）

Slack 上のチームの活動（発言・リアクション・感謝）を「盆栽」として可視化し、分報を書くきっかけとチーム内の状況共有をゆるやかに促すサービス。発言量を競わせるのではなく、日々の小さな発信が盆栽の成長として見えることを狙う。

> **現状**: Issue #128 により、ローカル開発基盤と web/api の最小スキャフォールドを整備している。機能実装の仕様は引き続き `docs/` を正とする。

## 何をするサービスか

- チームメンバーの Slack 上の活動を受信し、内部の活動イベントへ変換して記録する。
- 活動量に応じて、ユーザーごとの盆栽を育てる（成長は単調・不可逆、枯死なし）。
- 現実の季節と日々の活力で、盆栽と周囲の環境の見た目が変化する。
- 自分の盆栽と、同じチームのメンバーの盆栽一覧を表示する。

詳しい背景・要件は [docs/requirements.md](docs/requirements.md) を参照。

## 目標構成

| コンポーネント | 技術 / デプロイ | 役割 |
| --- | --- | --- |
| `apps/web` | React / Vite（TanStack Router・Query）・shadcn/ui + Radix Colors・Vercel | 画面表示に専念するビューア。初期表示・更新反映を HTTP API で取得（更新はポーリング）。 |
| `apps/api` | Hono + Slack Bolt・Cloud Run | HTTP API・Slack Webhook 受信・活動イベント変換・盆栽状態計算。DB へアクセスする唯一のコンポーネント。 |
| データベース | PostgreSQL（Cloud SQL） | チーム / ユーザー / 活動ログ / 盆栽状態を保持。`apps/api` のみアクセス。 |

構成・技術選定の詳細は [docs/architecture.md](docs/architecture.md) を参照。

## ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [requirements.md](docs/requirements.md) | 要件定義（背景・スコープ・機能／非機能要件・画面） |
| [architecture.md](docs/architecture.md) | アーキテクチャ設計（構成・技術スタック・データフロー・設計判断） |
| [api.md](docs/api.md) | API 設計（エンドポイント・認証・レスポンス・エラー） |
| [db.md](docs/db.md) | データベース設計（ER 図・テーブル定義・制約） |
| [visual.md](docs/visual.md) | ビジュアル設計（盆栽の 3D 表現・成長・季節・活力） |
| [design-tokens.md](docs/design-tokens.md) | デザイントークン / デザインシステム（サービス 2D UI・配色・WCAG） |
| [glossary.md](docs/glossary.md) | 用語集（ドメイン用語・物理名・計算値の一元定義） |
| [adr/](docs/adr/) | アーキテクチャ決定記録（ADR） |

## 開発

### 前提ツール

- [mise](https://mise.jdx.dev/) で Node.js 22 を管理する。
- [Vite+](https://viteplus.dev/) の `vp` CLI を導入する。
- Docker Desktopなど、Docker Composeを実行できる環境を用意する。

Vite+のNode.js管理を無効化し、Node.jsの管理をmiseへ委譲する。

```sh
curl -fsSL https://vite.plus | bash
vp env off
mise trust
mise install
```

### 初回セットアップ

```sh
cp .env.example .env
mise run install
```

`.env`にはローカルPostgreSQLの接続情報が含まれます。実際の秘密情報は記載せず、`.env`をGitへコミットしないでください。

### ローカルPostgreSQL

```sh
mise run db:up
mise run db:status
mise run api:db:check
mise run db:down
```

`api:db:check`はDrizzle経由で`SELECT 1`を実行し、apps/apiからPostgreSQLへ接続できることを確認します。

### 開発コマンド

```sh
mise run web:dev
mise run api:dev
mise run web:build
mise run web:check
mise run web:test
mise run api:typecheck
mise run api:lint
mise run api:format
mise run api:format:check
mise run api:test
mise run check
mise run test
```

Issue #128では開発基盤と最小スキャフォールドのみを扱います。Drizzleスキーマ・マイグレーションは#129、domainの成長ルールは#130、画面やルーティングは#135以降、Slack連携と認証は#132・#133、APIの本番バンドルとDockerfileは#140で実装します。

## ライセンス

本リポジトリのライセンスは [LICENSE](LICENSE) を参照。
