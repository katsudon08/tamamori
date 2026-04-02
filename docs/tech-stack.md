# 技術スタック

## 概要

| カテゴリ | 技術 | バージョン方針 |
|---------|------|-------------|
| フレームワーク | Next.js (App Router) | 最新安定版 |
| 言語 | TypeScript | 最新安定版 |
| 3D描画 | Three.js + React Three Fiber | 最新安定版 |
| データベース | Supabase (PostgreSQL) | Supabase Cloud |
| リアルタイム | Supabase Realtime | Supabase Cloud 付属 |
| 認証 | Slack OAuth + iron-session | - |
| データ取得 | SWR | 最新安定版 |
| CSS | Tailwind CSS | 最新安定版 |
| デプロイ | Vercel | - |
| パッケージマネージャ | npm | - |

## フロントエンド

### Next.js

- **役割**: フルスタックフレームワーク。フロントエンド・API Route・SSRを一体管理
- **App Router**: ファイルベースルーティング、Server Components、レイアウト共有
- **選定理由**: Vercelとの親和性、API RouteによるSlack Webhookエンドポイント提供、SSR/SSGのハイブリッド

### TypeScript

- **役割**: 型安全な開発
- **選定理由**: Supabase型生成（`supabase gen types`）との連携、Three.jsの型補完、コードベースの安全性向上

### React Three Fiber (@react-three/fiber)

- **役割**: Three.jsのReactバインディング。宣言的な3Dシーン構築
- **選定理由**: ReactコンポーネントとしてThree.jsを扱えるため、状態管理やライフサイクルをReactの流儀で統一できる

### @react-three/drei

- **役割**: R3Fのユーティリティ集。OrbitControls、Html（3D空間内のHTML描画）、InstancedMesh等
- **選定理由**: 頻出パターンの再実装を避ける

### SWR

- **役割**: クライアントサイドのデータ取得・キャッシュ管理
- **主要機能**:
  - `useSWR` — 宣言的なデータフェッチフック（stale-while-revalidate戦略）
  - `mutate()` — キャッシュの手動更新（Supabase Realtimeとの連携に使用）
  - `SWRConfig` の `fallback` — SSRで取得したデータの注入
- **選定理由**: フロントエンドがリードオンリーのため、ミューテーション管理が不要。TanStack Queryと比較して軽量（バンドルサイズ約1/3）で、シンプルなAPI。Three.jsを使う3Dアプリではバンドルサイズの軽量さが有利。詳細は [ADR-001](adr/001-swr-adoption.md) を参照

### Tailwind CSS

- **役割**: ユーティリティファーストCSS
- **選定理由**: 高速なUI構築、Next.jsとの統合が簡単

## バックエンド / インフラ

### Supabase

- **役割**: マネージドPostgreSQL + Realtime + Auth基盤
- **主要機能**:
  - **PostgreSQL**: データ永続化（users, bonsai, action_log, growth_rules テーブル）
  - **Realtime**: bonsaiテーブルの変更をWebSocketでフロントエンドにPush
  - **型生成**: `supabase gen types typescript` でDBスキーマからTypeScript型を自動生成
- **選定理由**: SQLによる集計クエリの容易さ、リレーショナルデータモデルとの相性、Realtime機能の提供

### Supabase クライアントライブラリ

| パッケージ | 用途 |
|-----------|------|
| `@supabase/supabase-js` | Supabase JavaScript クライアント |
| `@supabase/ssr` | Next.js App Router でのSSR対応ヘルパー |

### iron-session

- **役割**: 暗号化Cookieベースのセッション管理
- **選定理由**: Slack OAuth一本のシンプルな認証構成。next-authより軽量で依存が少ない

### Vercel

- **役割**: Next.jsアプリのホスティング・CDN
- **選定理由**: Next.js開発元。デプロイが最もシンプル。API Routeも自動で外部公開され、Slack Webhookエンドポイントとして利用可能

## Slack連携

### Slack App

- **方式**: Slack Events API（リアルタイムイベント受信）
- **必要なBot Token Scopes**:
  - `channels:history` - チャンネルメッセージ読み取り
  - `channels:read` - チャンネル一覧取得
  - `reactions:read` - リアクションイベント受信
  - `users:read` - ユーザープロフィール取得
- **Event Subscriptions**:
  - `message.channels` - メッセージ投稿イベント
  - `reaction_added` - リアクション追加イベント
- **署名検証**: `x-slack-signature` ヘッダーによるリクエスト検証

## テスト

### 開発方針

**TDD（テスト駆動開発）** で開発を進める。Red-Green-Refactorサイクルを基本とする。

1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装を書く
3. **Refactor**: コードを整理する

### テストツール

| レイヤー | ツール | 用途 |
|---------|-------|------|
| ロジック（単体テスト） | Jest | ビジネスロジック・ユーティリティ関数のテスト |
| UI（コンポーネントテスト） | Storybook + React Testing Library | コンポーネントの描画・インタラクションテスト |
| E2E（統合テスト） | Playwright | ユーザーフロー全体の動作確認 |

### テスト対象の分類

| テスト種別 | 対象例 | ツール |
|-----------|--------|-------|
| 単体テスト | 成長ポイント計算、アクション判定ロジック | Jest |
| コンポーネントテスト | 盆栽表示、ダッシュボードUI | Storybook + React Testing Library |
| E2Eテスト | ログイン → 盆栽閲覧 → 水やりフロー | Playwright |

## 開発ツール

| ツール | 用途 |
|-------|------|
| ESLint + eslint-plugin-fsd-lint | Linting + FSDアーキテクチャルール強制 |
| Prettier | コードフォーマット |
| ngrok | 開発時のSlack Webhook受信用トンネル |
| Supabase CLI | マイグレーション管理、型生成 |

## npm パッケージ一覧（予定）

### dependencies

```
next
react
react-dom
three
@react-three/fiber
@react-three/drei
@supabase/supabase-js
@supabase/ssr
iron-session
swr
```

### devDependencies

```
typescript
@types/react
@types/react-dom
@types/three
tailwindcss
postcss
autoprefixer
eslint
eslint-config-next
eslint-plugin-fsd-lint
prettier
jest
ts-jest
@types/jest
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event
storybook
@storybook/react
@storybook/nextjs
@playwright/test
```
