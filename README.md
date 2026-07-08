# たま森（tamamori）

Slack 上のチームの活動（発言・リアクション・感謝）を「盆栽」として可視化し、分報を書くきっかけとチーム内の状況共有をゆるやかに促すサービス。発言量を競わせるのではなく、日々の小さな発信が盆栽の成長として見えることを狙う。

> **現状**: このリポジトリは設計ドキュメントのみで構成されている（実装はこれから）。`docs/` を正として `apps/web`・`apps/api` をゼロから構築していく。

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

現在は実装コードを持たない。今後 `apps/web`・`apps/api` を pnpm ワークスペースのモノレポとして構築していく。セットアップ手順・開発コマンドは実装着手時に本 README へ追記する。

## ライセンス

本リポジトリのライセンスは [LICENSE](LICENSE) を参照。
