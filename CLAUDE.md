# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**たま森 (Tamamori)** — Slack連携の盆栽育成Webアプリ。チームのSlack活動（メッセージ、リアクション、感謝）に応じて仮想盆栽が8段階で成長する。

- **状態**: 設計完了・実装前（SSoTドキュメントのみ存在）
- **SSoTドキュメント**: `docs/` 配下に要件・アーキテクチャ・API・データモデル等あり。実装時は必ず参照すること

## Tech Stack

Next.js (App Router) / TypeScript / React Three Fiber (Three.js) / Supabase (PostgreSQL + Realtime) / Tailwind CSS / iron-session / Vercel

## Commands (planned)

```bash
npm run dev              # 開発サーバー起動
npm run build            # ビルド
npm run lint             # ESLint (FSDルール含む)
npm run test             # Jest 単体テスト
npm run test:watch       # Jest ウォッチモード
npm run test:e2e         # Playwright E2Eテスト
npm run storybook        # Storybook起動 (port 6006)
npm run gen:types        # Supabase型生成 → src/shared/lib/supabase/types.ts
```

## Architecture: Feature-Sliced Design (FSD)

レイヤー依存は上→下のみ。同一レイヤー内の他スライスへのインポートは禁止。`eslint-plugin-fsd-lint` で強制。

```
app        ← Next.js App Router (ルーティング・レイアウト・API Routes)
 ↓
widgets    ← 大きなUI構成ブロック (BonsaiViewer, GardenViewer, StatsPanel)
 ↓
features   ← ビジネスロジック (slack-auth, bonsai-growth, realtime-sync)
 ↓
entities   ← ドメインモデル (bonsai, user, action)
 ↓
shared     ← 共有インフラ (ui/, lib/, config/, types/)
```

### Key Rules

- **Public API**: 各スライスは `index.ts` で公開。内部ファイルへの直接インポート禁止
- **Path alias**: `@/*` → `./src/*`
- **app層のpage.tsx**: 薄く保ち、widgets層に委譲
- **API Routes**: ロジックはfeatures層に委譲

```tsx
// OK
import { BonsaiViewer } from '@/widgets/bonsai-viewer';
import { env } from '@/shared/config';

// NG
import BonsaiViewer from '@/widgets/bonsai-viewer/ui/BonsaiViewer';
```

## Core Processing Flow

Slackイベント → `POST /api/slack/events` → 署名検証 → 即座に200返却 → `waitUntil()` で非同期処理（冪等性チェック → イベント分類 → カウンター更新 → ステージ判定 → visual_state再計算 → DB更新 → Supabase RealtimeでフロントエンドにPush）

## Naming Conventions

- コンポーネント: PascalCase (`BonsaiViewer.tsx`)
- ユーティリティ: camelCase (`verifySignature.ts`)
- ファイル / ディレクトリ: kebab-case (`bonsai-viewer/`)
- 型: PascalCase (`BonsaiVisualState`)

## Testing

TDD (Red-Green-Refactor) で開発。Jest (単体) / Storybook + RTL (コンポーネント) / Playwright (E2E)

## Branching

- `main` — 本番 (Vercel自動デプロイ)
- `develop` — 開発統合
- 作業ブランチは `develop` から分岐。命名は Conventional Commit の type に従う:
    - `<type>/<description>` — 例: `feat/garden-view`, `fix/slack-signature`
    - イシュー番号付き: `<type>/<issue番号>-<description>` — 例: `feat/28-realtime-sync`, `fix/15-oauth-redirect`
