# ADR-002: ランタイムバリデーションライブラリとしてZodを採用

## ステータス

承認済み (2026-04-03)

## コンテキスト

本プロジェクトには外部データが流入するシステム境界が複数存在し、ランタイムでのバリデーションが必要である。TypeScriptの型はコンパイル時にのみ有効であり、外部入力に対しては実行時の検証が不可欠である。

### バリデーションが必要なシステム境界

#### 1. Slack Webhook (`POST /api/slack/events`) — 最重要

- Slackから送信されるイベントペイロード（`url_verification` / `event_callback`）
- イベント種別に応じて構造が異なる（message / reaction_added）
- 不正なペイロードがDBに到達すると、冪等性チェックの破綻やカウンター異常を引き起こす

#### 2. OAuth Callback (`GET /api/auth/slack/callback`)

- クエリパラメータ（`code`, `state`）
- Slackトークン交換レスポンス（`user_id`, `team_id`, `name`, `picture`）
- 不正なユーザーデータがusersテーブルに入るリスク

#### 3. 環境変数

- `SLACK_CLIENT_ID`, `SLACK_SIGNING_SECRET`, `SUPABASE_URL` 等の必須設定
- 不備があるとランタイムエラーで初めて発覚する

#### 4. Supabase レスポンス / Realtime ペイロード

- `visual_state`（JSONB）がThree.jsレンダリングに直結
- 不正な値（NaN, 範囲外）が3Dシーンをクラッシュさせるリスク

## 検討した選択肢

### 選択肢A: Zod ✅ 採用

**メリット:**

- `z.infer<typeof schema>` でスキーマからTypeScript型を自動導出 — 型定義の二重管理を防止
- `z.discriminatedUnion` でSlackイベントの型判別が自然に書ける
- 環境変数バリデーション（`z.object({...}).parse(process.env)`）で起動時に全設定の不備を検出
- エコシステムが充実（ドキュメント、事例、ライブラリ統合が豊富）
- バンドルサイズ: ~12KB (gzip ~4KB)。Three.js (~300KB+) に比べ無視できる
- APIが直感的で学習コストが低い

**デメリット:**

- Valibotより若干大きいバンドルサイズ（~6KB差）
- ランタイムバリデーションのオーバーヘッド（このプロジェクトの規模では無視できる）

### 選択肢B: Valibot

**メリット:**

- Zodより軽量（~6KB, gzip ~2KB）
- Tree-shakingに最適化された関数ベースAPI

**デメリット:**

- エコシステムがZodに比べ小規模（ドキュメント、事例、サードパーティ統合が少ない）
- `discriminatedUnion`の表現力がZodに劣る
- コミュニティのナレッジベースが限定的

### 選択肢C: 手動バリデーション（ライブラリ不使用）

**メリット:**

- 依存ゼロ

**デメリット:**

- 型定義とバリデーションロジックの二重管理が発生
- Slackイベントの判別ロジックが冗長かつエラーを起こしやすい
- 環境変数チェックが散在し、漏れが発生しやすい
- テストの記述量が大幅に増加

## 決定

**Zodを採用する。**

## 理由

1. **型とバリデーションの一元化**: `z.infer`でスキーマからTypeScript型を導出でき、型定義の二重管理（手動の`interface`とバリデーションロジック）を防げる。entities層の`model/types.ts`でZodスキーマを定義し、そこから型をエクスポートする
2. **Slackイベントの判別に最適**: `z.discriminatedUnion`で`type`フィールドに基づく構造検証が宣言的に書ける。手動実装では煩雑になるパターン
3. **環境変数の早期検出**: `z.object({...}).parse(process.env)`でアプリ起動時にすべての設定不備を一括検出できる。現在`shared/config/env.ts`が計画されており、Zodで実装すると最も簡潔
4. **バンドルサイズが許容範囲内**: ~12KB (gzip ~4KB) はThree.js (~300KB+) を使う本プロジェクトでは無視できるサイズ。Valibotとの差（~6KB）も影響が小さい
5. **エコシステムの充実**: ValibotよりZodの方がドキュメント、事例、ライブラリ統合が圧倒的に豊富。問題解決が速い

## 影響

### パッケージ

- `zod` を dependencies に追加

### バリデーション適用箇所（FSD配置）

| バリデーション対象      | Zodスキーマの配置場所                           | 用途                                       |
| ----------------------- | ----------------------------------------------- | ------------------------------------------ |
| 環境変数                | `shared/config/env.ts`                          | 起動時に全設定を検証                       |
| Slackイベントペイロード | `features/slack-auth/lib/slack-event-schema.ts` | Webhookリクエストボディの検証              |
| OAuthコールバック       | `features/slack-auth/lib/slack-oauth-schema.ts` | クエリパラメータ・トークンレスポンスの検証 |
| エンティティ型定義      | `entities/*/model/types.ts`                     | Zodスキーマから型を導出（`z.infer`）       |

### 型定義パターン

entities層の `model/types.ts` では、Zodスキーマを定義し `z.infer` で型を導出する:

```typescript
// entities/bonsai/model/types.ts
import { z } from 'zod';

export const growthStageSchema = z.enum([
    'seed',
    'sprout',
    'young',
    'branching',
    'leafy',
    'budding',
    'flowering',
    'full_bloom',
]);

export const visualStateSchema = z.object({
    trunkHeight: z.number(),
    trunkThickness: z.number(),
    branches: z.array(
        z.object({
            angle: z.number(),
            length: z.number(),
            depth: z.number().int(),
            seed: z.number(),
        }),
    ),
    leaves: z.number().int(),
    leafColor: z.string(),
    flowers: z.number().int(),
    flowerColor: z.string(),
    potColor: z.string(),
});

export type GrowthStage = z.infer<typeof growthStageSchema>;
export type BonsaiVisualState = z.infer<typeof visualStateSchema>;
```
