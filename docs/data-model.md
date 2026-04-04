# データモデル設計

## ER図

```mermaid
erDiagram
    users ||--|| bonsai : "1:1"
    users ||--o{ action_log : "1:N"

    users {
        UUID id PK
        TEXT slack_user_id UK
        TEXT slack_team_id
        TEXT display_name
        TEXT avatar_url
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    bonsai {
        UUID id PK
        UUID user_id FK,UK
        INT total_messages
        INT total_reactions
        INT total_thanks
        TEXT growth_stage
        JSONB visual_state
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    action_log {
        UUID id PK
        UUID user_id FK
        TEXT action_type
        TEXT slack_event_id UK
        TEXT slack_channel
        JSONB metadata
        TIMESTAMPTZ created_at
    }

    growth_rules {
        UUID id PK
        TEXT stage UK
        INT min_messages
        INT min_reactions
        INT min_thanks
        INT sort_order
    }
```

## テーブル定義

### users

Slackユーザーとアプリユーザーを紐付けるテーブル。

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT UNIQUE NOT NULL,
  slack_team_id TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_slack_user_id ON users(slack_user_id);
```

| カラム        | 型          | 制約                          | 説明                                |
| ------------- | ----------- | ----------------------------- | ----------------------------------- |
| id            | UUID        | PK, DEFAULT gen_random_uuid() | 内部ID                              |
| slack_user_id | TEXT        | UNIQUE, NOT NULL              | Slack ユーザーID (例: U01XXXX)      |
| slack_team_id | TEXT        | NOT NULL                      | Slack チームID (例: T01XXXX)        |
| display_name  | TEXT        | NOT NULL                      | 表示名（Slackプロフィールから取得） |
| avatar_url    | TEXT        |                               | アバター画像URL                     |
| created_at    | TIMESTAMPTZ | NOT NULL, DEFAULT now()       | レコード作成日時                    |
| updated_at    | TIMESTAMPTZ | NOT NULL, DEFAULT now()       | レコード更新日時                    |

### bonsai

各ユーザーの盆栽状態を管理するテーブル。1ユーザーにつき1レコード。

```sql
CREATE TABLE bonsai (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_messages  INT NOT NULL DEFAULT 0,
  total_reactions INT NOT NULL DEFAULT 0,
  total_thanks    INT NOT NULL DEFAULT 0,
  growth_stage    TEXT NOT NULL DEFAULT 'seed'
                  CHECK (growth_stage IN (
                    'seed', 'sprout', 'young', 'branching',
                    'leafy', 'budding', 'flowering', 'full_bloom'
                  )),
  visual_state    JSONB NOT NULL DEFAULT '{
    "trunkHeight": 0.3,
    "trunkThickness": 0.05,
    "branches": [],
    "leaves": 0,
    "leafColor": "#228B22",
    "flowers": 0,
    "flowerColor": "#FFB7C5",
    "potColor": "#8B4513"
  }'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bonsai_user_id ON bonsai(user_id);
```

| カラム          | 型          | 制約                             | 説明                     |
| --------------- | ----------- | -------------------------------- | ------------------------ |
| id              | UUID        | PK                               | 内部ID                   |
| user_id         | UUID        | FK → users(id), UNIQUE, NOT NULL | 所有ユーザー             |
| total_messages  | INT         | NOT NULL, DEFAULT 0              | メッセージ投稿の累計数   |
| total_reactions | INT         | NOT NULL, DEFAULT 0              | リアクション追加の累計数 |
| total_thanks    | INT         | NOT NULL, DEFAULT 0              | 感謝メッセージの累計数   |
| growth_stage    | TEXT        | NOT NULL, CHECK制約              | 現在の成長ステージ       |
| visual_state    | JSONB       | NOT NULL                         | Three.js描画用パラメータ |
| created_at      | TIMESTAMPTZ | NOT NULL                         | レコード作成日時         |
| updated_at      | TIMESTAMPTZ | NOT NULL                         | レコード更新日時         |

### action_log

Slackイベントの記録。追記専用（UPDATE/DELETE なし）。統計・履歴・監査に使用。

```sql
CREATE TABLE action_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type     TEXT NOT NULL CHECK (action_type IN ('message', 'reaction', 'thanks')),
  slack_event_id  TEXT UNIQUE,
  slack_channel   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_log_user_created ON action_log(user_id, created_at DESC);
CREATE INDEX idx_action_log_event_id ON action_log(slack_event_id);
CREATE INDEX idx_action_log_type ON action_log(action_type, created_at DESC);
```

| カラム         | 型          | 制約                     | 説明                                        |
| -------------- | ----------- | ------------------------ | ------------------------------------------- |
| id             | UUID        | PK                       | 内部ID                                      |
| user_id        | UUID        | FK → users(id), NOT NULL | アクション実行ユーザー                      |
| action_type    | TEXT        | NOT NULL, CHECK制約      | アクション種別: message / reaction / thanks |
| slack_event_id | TEXT        | UNIQUE                   | Slack event_id（冪等性キー）                |
| slack_channel  | TEXT        |                          | イベント発生チャンネルID                    |
| metadata       | JSONB       | NOT NULL, DEFAULT '{}'   | 付加情報                                    |
| created_at     | TIMESTAMPTZ | NOT NULL                 | イベント発生日時                            |

#### metadata の例

```jsonc
// message アクション
{ "text_snippet": "今日もがんばりましょう！" }

// reaction アクション
{ "emoji": "thumbsup", "target_ts": "1234567890.123456" }

// thanks アクション
{ "text_snippet": "ありがとうございます！", "keyword": "ありがとう" }
```

### growth_rules

成長ステージの閾値を管理する設定テーブル。デプロイなしで閾値を調整可能にする。

```sql
CREATE TABLE growth_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage         TEXT UNIQUE NOT NULL,
  min_messages  INT NOT NULL,
  min_reactions INT NOT NULL,
  min_thanks    INT NOT NULL,
  sort_order    INT NOT NULL
);

-- 初期データ
INSERT INTO growth_rules (stage, min_messages, min_reactions, min_thanks, sort_order) VALUES
  ('seed',        0,   0,   0,  0),
  ('sprout',      5,   0,   0,  1),
  ('young',      15,   5,   0,  2),
  ('branching',  30,  15,   3,  3),
  ('leafy',      60,  30,  10,  4),
  ('budding',   100,  50,  20,  5),
  ('flowering', 150,  80,  35,  6),
  ('full_bloom', 250, 120,  60,  7);
```

| カラム        | 型   | 制約             | 説明                   |
| ------------- | ---- | ---------------- | ---------------------- |
| id            | UUID | PK               | 内部ID                 |
| stage         | TEXT | UNIQUE, NOT NULL | ステージ名             |
| min_messages  | INT  | NOT NULL         | 必要最低メッセージ数   |
| min_reactions | INT  | NOT NULL         | 必要最低リアクション数 |
| min_thanks    | INT  | NOT NULL         | 必要最低感謝数         |
| sort_order    | INT  | NOT NULL         | ステージの順序（昇順） |

#### ステージ判定ロジック

現在のステージは、`total_messages >= min_messages AND total_reactions >= min_reactions AND total_thanks >= min_thanks` を満たす最も `sort_order` が高い行に一致する。3種のアクションすべてのバランスが求められる設計。

## visual_state (JSONB) 構造定義

盆栽の3D描画に必要な全パラメータをJSONBで保持する。サーバーサイドで計算し、全クライアントが同一の見た目を描画できるようにする。

### TypeScript 型定義

```typescript
interface BonsaiVisualState {
    trunkHeight: number; // 幹の高さ (0.3 ~ 2.0)
    trunkThickness: number; // 幹の太さ (0.05 ~ 0.25)
    branches: Branch[]; // 枝の配列
    leaves: number; // 葉の総数 (0 ~ 80)
    leafColor: string; // 葉の色 (hex)
    flowers: number; // 花の総数 (0 ~ 30)
    flowerColor: string; // 花の色 (hex)
    potColor: string; // 鉢の色 (hex)
}

interface Branch {
    angle: number; // 枝の角度 (度数法)
    length: number; // 枝の長さ
    depth: number; // 枝の階層 (1 = 幹から直接, 2 = 枝から分岐)
    seed: number; // 決定的乱数シード (描画の再現性確保)
}
```

### 計算式

```
trunkHeight    = min(2.0,  0.3  + totalMessages  * 0.007)
trunkThickness = min(0.25, 0.05 + totalMessages  * 0.001)
branchCount    = min(20,   floor(totalMessages / 8))
leaves         = min(80,   floor(totalReactions / 2))
flowers        = min(30,   floor(totalThanks / 3))
```

### 枝の決定的生成

各枝の `angle` と `seed` は `hash(userId + branchIndex)` から決定的に生成する。これにより:

- 同じユーザーの盆栽は常に同じ形状になる
- 新しい枝が追加されても、既存の枝の位置は変わらない
- 異なるクライアントで同じ見た目が保証される

## Supabase Realtime 設定

`bonsai` テーブルのRealtimeを有効化する。

```sql
-- Supabase のリアルタイム機能を bonsai テーブルに対して有効化
ALTER PUBLICATION supabase_realtime ADD TABLE bonsai;
```

フロントエンドは `postgres_changes` イベントの `UPDATE` を購読し、`visual_state` や `growth_stage` の変更を検知する。

## updated_at の自動更新

```sql
-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users テーブル
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- bonsai テーブル
CREATE TRIGGER trigger_bonsai_updated_at
  BEFORE UPDATE ON bonsai
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## マイグレーションファイル一覧

| ファイル                      | 内容                                                 |
| ----------------------------- | ---------------------------------------------------- |
| `001_create_users.sql`        | users テーブル + インデックス + updated_at トリガー  |
| `002_create_bonsai.sql`       | bonsai テーブル + インデックス + updated_at トリガー |
| `003_create_action_log.sql`   | action_log テーブル + インデックス                   |
| `004_create_growth_rules.sql` | growth_rules テーブル + 初期データ                   |
| `005_enable_realtime.sql`     | bonsai テーブルの Realtime 有効化                    |
