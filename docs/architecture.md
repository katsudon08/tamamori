# アーキテクチャ構成

## システム全体像

```
┌─────────────┐     Events API      ┌──────────────────────────────┐
│   Slack     │ ──────────────────> │  Next.js (Vercel)            │
│  Workspace  │                     │                              │
│             │ <── OAuth ────────> │  ┌──────────────────────┐    │
└─────────────┘                     │  │ API Routes            │    │
                                    │  │  /api/slack/events     │    │
                                    │  │  /api/auth/slack/*     │    │
                                    │  └──────────┬─────────────┘    │
                                    │             │                  │
                                    │  ┌──────────▼─────────────┐    │
                                    │  │ Growth Engine          │    │
                                    │  │  イベント分類            │    │
                                    │  │  カウンター更新          │    │
                                    │  │  ステージ判定            │    │
                                    │  │  ビジュアルステート計算   │    │
                                    │  └──────────┬─────────────┘    │
                                    │             │                  │
                                    │  ┌──────────▼─────────────┐    │
                                    │  │ Frontend (React/R3F)   │    │
                                    │  │  盆栽3Dビューア         │    │
                                    │  │  花壇ビュー             │    │
                                    │  │  統計ページ             │    │
                                    │  └─────────────────────────┘    │
                                    └──────────────┬─────────────────┘
                                                   │
                                    ┌──────────────▼─────────────────┐
                                    │  Supabase                      │
                                    │  ┌───────────┐ ┌────────────┐  │
                                    │  │ PostgreSQL │ │ Realtime   │  │
                                    │  │  users     │ │ WebSocket  │──── Push to Frontend
                                    │  │  bonsai    │ │            │  │
                                    │  │  action_log│ └────────────┘  │
                                    │  │  growth_   │                 │
                                    │  │  rules     │                 │
                                    │  └───────────┘                  │
                                    └─────────────────────────────────┘
```

## イベント処理フロー

```
1. Slackでイベント発生（メッセージ投稿 / リアクション追加）
   │
2. Slack Events API → POST /api/slack/events
   │
3. 署名検証 (x-slack-signature)
   │
4. 200 OK を即座に返却（Slackの3秒ルール対応）
   │
5. waitUntil() で非同期処理を開始
   │
   ├─ 6a. チャンネルフィルタリング（SLACK_WATCHED_CHANNELS に含まれるか）
   │
   ├─ 6b. 冪等性チェック（slack_event_id が action_log に存在するか）
   │
   ├─ 6c. イベント分類
   │       ├─ message.channels → "message" (+ テキストに感謝キーワードがあれば "thanks" も)
   │       └─ reaction_added   → "reaction"
   │
   ├─ 7. ユーザー upsert（users テーブル）
   │
   ├─ 8. action_log に挿入
   │
   ├─ 9. bonsai カウンター更新 (total_messages / total_reactions / total_thanks)
   │
   ├─ 10. 成長ステージ再判定（growth_rules テーブルと比較）
   │
   └─ 11. visual_state 再計算 → bonsai テーブル UPDATE
                                       │
                                       ▼
                              Supabase Realtime が変更を検知
                                       │
                                       ▼
                              フロントエンドに WebSocket で Push
                                       │
                                       ▼
                              Three.js シーンが lerp アニメーションで更新
```

## 認証フロー

```
1. ユーザーが "/" にアクセス → ランディングページ表示
   │
2. "Sign in with Slack" ボタンをクリック
   │
3. GET /api/auth/slack → Slack OAuth 認可URL にリダイレクト
   │  (scopes: openid, profile)
   │
4. ユーザーがSlackで認可
   │
5. Slack → GET /api/auth/slack/callback?code=xxx
   │
6. code をトークンに交換 → Slack user_id, team_id, display_name, avatar 取得
   │
7. users テーブルに upsert + bonsai レコードが未存在なら作成
   │
8. iron-session でセッションCookieを設定
   │
9. /garden にリダイレクト
```

## レイヤーアーキテクチャ (FSD)

本プロジェクトは Feature-Sliced Design (FSD) アーキテクチャを採用する。

### レイヤー構成と依存ルール

```
  app        ← エントリポイント。Next.js App Router のルーティング・レイアウト・プロバイダー
   ↓ import
  widgets    ← 大きなUI構成ブロック。複数の features/entities を組み合わせる
   ↓ import
  features   ← ユーザーインタラクション。ビジネスロジックを含む
   ↓ import
  entities   ← ビジネスエンティティ。型定義、API呼び出し、UIパーツ
   ↓ import
  shared     ← 共有インフラ。UI基盤、ユーティリティ、設定、型
```

**依存ルール**: 上位レイヤーは下位レイヤーのみをインポートできる。同一レイヤー内の他スライスへのインポートは禁止。

### 各レイヤーの責務

| レイヤー | 責務 | このプロジェクトでの例 |
|---------|------|---------------------|
| app | ルーティング、レイアウト、プロバイダー | Next.js App Router のページ、Supabaseプロバイダー |
| widgets | 画面を構成する大きなブロック | BonsaiViewer（盆栽3Dビューア）、GardenViewer（花壇ビュー）、StatsPanel |
| features | ユーザー操作・ビジネスロジック | Slack認証フロー、成長計算エンジン、リアルタイム同期 |
| entities | ビジネスエンティティ | Bonsai（型, API, UI）、User、Action |
| shared | ビジネスロジックを持たない共有コード | UIコンポーネント、Supabase/Slackクライアント、設定、型定義 |

### スライス内の構成（Segment）

各スライスは以下のセグメントで構成される:

```
feature-name/
├── index.ts          # Public API（外部に公開するもの）
├── ui/               # UIコンポーネント
├── model/            # ビジネスロジック、型定義、状態管理
├── api/              # API呼び出し、データフェッチ
└── lib/              # ユーティリティ関数
```

## デプロイアーキテクチャ

```
┌──────────────┐
│   Vercel     │
│              │
│  Next.js App │
│  ├─ SSR/SSG  │ ←── Static + Server-side rendering
│  ├─ API Routes│ ←── Slack Webhook, Auth endpoints
│  └─ Edge     │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────┐
│  Supabase    │
│  (Cloud)     │
│  ├─ Database │
│  ├─ Realtime │
│  └─ Auth*    │  * 将来的に利用検討
└──────────────┘
```

- **Vercel**: Next.jsアプリのホスティング。自動デプロイ（Git push）、プレビューデプロイ対応
- **Supabase**: マネージドPostgreSQL + Realtime。無料枠で十分な規模

## 設計判断の記録

| 判断 | 選択 | 理由 |
|------|------|------|
| 3D描画方式 | プロシージャル生成 | 各盆栽がユニークで連続変化するため。glTFモデルでは表現が制限される |
| visual_stateの保存場所 | サーバーサイド（DB） | 全クライアントで同一の見た目を保証するため |
| 成長閾値の管理 | DBテーブル（growth_rules） | デプロイなしで調整可能にするため |
| セッション管理 | iron-session | Slackのみの単一OAuth。next-authより軽量 |
| Slack連携方式 | Events API（リアルタイム） | ポーリングでは盆栽成長のリアルタイム体験が損なわれる |
| 非同期処理 | Vercel waitUntil() | Slackの3秒ルール対応。DB処理をレスポンス後に実行 |
| データ取得管理 | SWR（TanStack Queryではなく） | フロントエンドがリードオンリーでミューテーション不要。軽量で3Dアプリに有利。詳細は [ADR-001](adr/001-swr-adoption.md) |
