# アーキテクチャ構成

## システム全体像

```mermaid
flowchart TD
    subgraph Slack["Slack Workspace"]
        S[Slack]
    end

    subgraph Vercel["Next.js (Vercel)"]
        API["API Routes\n/api/slack/events\n/api/auth/slack/*"]
        GE["Growth Engine\nイベント分類\nカウンター更新\nステージ判定\nビジュアルステート計算"]
        FE["Frontend (React/R3F)\n盆栽3Dビューア\n花壇ビュー\n統計ページ"]

        API --> GE --> FE
    end

    subgraph Supabase
        PG["PostgreSQL\nusers / bonsai\naction_log / growth_rules"]
        RT["Realtime\nWebSocket"]
    end

    S -- "Events API" --> API
    S <-- "OAuth" --> API
    GE --> PG
    RT -- "Push to Frontend" --> FE
```

## イベント処理フロー

```mermaid
flowchart TD
    A["1. Slackでイベント発生\n（メッセージ投稿 / リアクション追加）"]
    B["2. Slack Events API\nPOST /api/slack/events"]
    C["3. 署名検証\n(x-slack-signature)"]
    D["4. 200 OK を即座に返却\n（Slackの3秒ルール対応）"]
    E["5. waitUntil() で非同期処理を開始"]
    F6a["6a. チャンネルフィルタリング\n（SLACK_WATCHED_CHANNELS に含まれるか）"]
    F6b["6b. 冪等性チェック\n（slack_event_id が action_log に存在するか）"]
    F6c["6c. イベント分類"]
    F6c_msg["message.channels → message\n(+ 感謝キーワードがあれば thanks も)"]
    F6c_react["reaction_added → reaction"]
    F7["7. ユーザー upsert（users テーブル）"]
    F8["8. action_log に挿入"]
    F9["9. bonsai カウンター更新\n(total_messages / total_reactions / total_thanks)"]
    F10["10. 成長ステージ再判定\n（growth_rules テーブルと比較）"]
    F11["11. visual_state 再計算\nbonsai テーブル UPDATE"]
    G["Supabase Realtime が変更を検知"]
    H["フロントエンドに WebSocket で Push"]
    I["Three.js シーンが lerp アニメーションで更新"]

    A --> B --> C --> D --> E
    E --> F6a --> F6b --> F6c
    F6c --> F6c_msg
    F6c --> F6c_react
    F6c --> F7 --> F8 --> F9 --> F10 --> F11
    F11 --> G --> H --> I
```

## 認証フロー

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant App as Next.js App
    participant SlackOAuth as Slack OAuth
    participant DB as Supabase

    User->>App: 1. "/" にアクセス
    App-->>User: ランディングページ表示
    User->>App: 2. "Sign in with Slack" クリック
    App->>SlackOAuth: 3. GET /api/auth/slack → 認可URLにリダイレクト<br/>(scopes: openid, profile)
    User->>SlackOAuth: 4. Slackで認可
    SlackOAuth->>App: 5. GET /api/auth/slack/callback?code=xxx
    App->>SlackOAuth: 6. code をトークンに交換
    SlackOAuth-->>App: user_id, team_id, display_name, avatar
    App->>DB: 7. users upsert + bonsai レコード作成（未存在時）
    App->>App: 8. iron-session でセッションCookie設定
    App-->>User: 9. /garden にリダイレクト
```

## レイヤーアーキテクチャ (FSD)

本プロジェクトは Feature-Sliced Design (FSD) アーキテクチャを採用する。

### レイヤー構成と依存ルール

```mermaid
graph TD
    app["app\nエントリポイント\nNext.js App Router のルーティング・レイアウト・プロバイダー"]
    widgets["widgets\n大きなUI構成ブロック\n複数の features/entities を組み合わせる"]
    features["features\nユーザーインタラクション\nビジネスロジックを含む"]
    entities["entities\nビジネスエンティティ\n型定義、API呼び出し、UIパーツ"]
    shared["shared\n共有インフラ\nUI基盤、ユーティリティ、設定、型"]

    app -- "import" --> widgets
    widgets -- "import" --> features
    features -- "import" --> entities
    entities -- "import" --> shared
```

**依存ルール**: 上位レイヤーは下位レイヤーのみをインポートできる。同一レイヤー内の他スライスへのインポートは禁止。

### 各レイヤーの責務

| レイヤー | 責務                                   | このプロジェクトでの例                                                 |
| -------- | -------------------------------------- | ---------------------------------------------------------------------- |
| app      | ルーティング、レイアウト、プロバイダー | Next.js App Router のページ、Supabaseプロバイダー                      |
| widgets  | 画面を構成する大きなブロック           | BonsaiViewer（盆栽3Dビューア）、GardenViewer（花壇ビュー）、StatsPanel |
| features | ユーザー操作・ビジネスロジック         | Slack認証フロー、成長計算エンジン、リアルタイム同期                    |
| entities | ビジネスエンティティ                   | Bonsai（型, API, UI）、User、Action                                    |
| shared   | ビジネスロジックを持たない共有コード   | UIコンポーネント、Supabase/Slackクライアント、設定、型定義             |

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

```mermaid
flowchart TD
    subgraph Vercel
        App["Next.js App"]
        SSR["SSR/SSG\nStatic + Server-side rendering"]
        Routes["API Routes\nSlack Webhook, Auth endpoints"]
        Edge["Edge"]

        App --- SSR
        App --- Routes
        App --- Edge
    end

    subgraph Supabase["Supabase (Cloud)"]
        Database
        Realtime
        Auth["Auth *\n* 将来的に利用検討"]
    end

    Vercel -- "HTTPS" --> Supabase
```

- **Vercel**: Next.jsアプリのホスティング。自動デプロイ（Git push）、プレビューデプロイ対応
- **Supabase**: マネージドPostgreSQL + Realtime。無料枠で十分な規模

## 設計判断の記録

| 判断                   | 選択                             | 理由                                                                                                                              |
| ---------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 3D描画方式             | プロシージャル生成               | 各盆栽がユニークで連続変化するため。glTFモデルでは表現が制限される                                                                |
| visual_stateの保存場所 | サーバーサイド（DB）             | 全クライアントで同一の見た目を保証するため                                                                                        |
| 成長閾値の管理         | DBテーブル（growth_rules）       | デプロイなしで調整可能にするため                                                                                                  |
| セッション管理         | iron-session                     | Slackのみの単一OAuth。next-authより軽量                                                                                           |
| Slack連携方式          | Events API（リアルタイム）       | ポーリングでは盆栽成長のリアルタイム体験が損なわれる                                                                              |
| 非同期処理             | Vercel waitUntil()               | Slackの3秒ルール対応。DB処理をレスポンス後に実行                                                                                  |
| データ取得管理         | SWR（TanStack Queryではなく）    | フロントエンドがリードオンリーでミューテーション不要。軽量で3Dアプリに有利。詳細は [ADR-001](adr/001-swr-adoption.md)             |
| バリデーション         | Zod（Valibot・手動実装ではなく） | 型とバリデーションの一元化（`z.infer`）。Slackイベント判別に`discriminatedUnion`が最適。詳細は [ADR-002](adr/002-zod-adoption.md) |
