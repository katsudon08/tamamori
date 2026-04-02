# API設計

## 概要

本アプリケーションのAPIは以下の3種類に大別される:

1. **Slack Webhook API** — Slack Events API からのイベント受信
2. **認証 API** — Slack OAuth によるユーザー認証
3. **Supabase クライアント API** — フロントエンドからのデータ取得（Supabase JS クライアント経由）

## 1. Slack Webhook API

### POST /api/slack/events

Slack Events API のイベントを受信するエンドポイント。

#### リクエスト

Slackから送信されるリクエスト。ヘッダーに署名情報が含まれる。

**Headers:**
```
Content-Type: application/json
X-Slack-Signature: v0=xxxx
X-Slack-Request-Timestamp: 1234567890
```

#### URL Verification（初回のみ）

Slack App のイベントURL設定時に送信されるチャレンジリクエスト。

**Request Body:**
```json
{
  "type": "url_verification",
  "challenge": "xxxx",
  "token": "xxxx"
}
```

**Response:**
```json
{
  "challenge": "xxxx"
}
```

#### メッセージイベント

チャンネルにメッセージが投稿された時。

**Request Body:**
```json
{
  "type": "event_callback",
  "event_id": "Ev01XXXX",
  "team_id": "T01XXXX",
  "event": {
    "type": "message",
    "subtype": null,
    "user": "U01XXXX",
    "text": "今日もがんばりましょう！",
    "channel": "C01XXXX",
    "ts": "1234567890.123456"
  }
}
```

**処理内容:**
1. `X-Slack-Signature` で署名検証
2. `event_id` で冪等性チェック（`action_log.slack_event_id` と照合）
3. `channel` が `SLACK_WATCHED_CHANNELS` に含まれるか確認
4. `subtype` が null の通常メッセージのみ処理（bot メッセージ、編集等は除外）
5. ユーザー upsert
6. `action_log` に `action_type: "message"` で挿入
7. テキストに感謝キーワードが含まれる場合、追加で `action_type: "thanks"` を挿入
8. `bonsai.total_messages` をインクリメント（+感謝なら `total_thanks` も）
9. 成長ステージ再判定 + `visual_state` 再計算
10. `bonsai` テーブル更新

**Response:** `200 OK`（ボディなし。処理は `waitUntil()` で非同期実行）

#### リアクション追加イベント

メッセージにリアクションが追加された時。

**Request Body:**
```json
{
  "type": "event_callback",
  "event_id": "Ev02XXXX",
  "team_id": "T01XXXX",
  "event": {
    "type": "reaction_added",
    "user": "U01XXXX",
    "reaction": "thumbsup",
    "item": {
      "type": "message",
      "channel": "C01XXXX",
      "ts": "1234567890.123456"
    }
  }
}
```

**処理内容:**
1. 署名検証
2. 冪等性チェック
3. チャンネルフィルタリング
4. ユーザー upsert
5. `action_log` に `action_type: "reaction"` で挿入（`metadata` にリアクション絵文字を記録）
6. `bonsai.total_reactions` をインクリメント
7. 成長ステージ再判定 + `visual_state` 再計算
8. `bonsai` テーブル更新

**Response:** `200 OK`

#### エラーハンドリング

| ケース | 対応 |
|-------|------|
| 署名検証失敗 | `401 Unauthorized` を返却 |
| 重複イベント（冪等性違反） | 処理をスキップし `200 OK` を返却 |
| 監視対象外チャンネル | 処理をスキップし `200 OK` を返却 |
| DB書き込みエラー | ログ出力。`200 OK` を返却（Slackのリトライに委ねる） |

#### 感謝キーワード検出

以下のキーワードのいずれかがメッセージテキストに含まれる場合、感謝アクションとして追加カウント:

```
["ありがとう", "ありがと", "アリガトウ", "感謝"]
```

## 2. 認証 API

### GET /api/auth/slack

Slack OAuth フローを開始するエンドポイント。

**処理内容:**
1. Slack OAuth 認可URLを構築
   - `client_id`: `SLACK_CLIENT_ID`
   - `scope`: `openid,profile`
   - `redirect_uri`: `{ORIGIN}/api/auth/slack/callback`
   - `state`: CSRF対策用ランダムトークン（セッションに保存）
2. Slack認可URLにリダイレクト

**Response:** `302 Redirect` → Slack認可ページ

### GET /api/auth/slack/callback

Slack OAuth コールバックエンドポイント。

**Query Parameters:**
- `code` — 認可コード
- `state` — CSRF検証用トークン

**処理内容:**
1. `state` パラメータをセッション保存値と照合（CSRF対策）
2. `code` を使って Slack の `openid.connect.token` API でトークン交換
3. トークンから `user_id`, `team_id`, `name`, `picture` を取得
4. `users` テーブルに upsert
5. `bonsai` レコードが未存在なら作成（初期状態: seed ステージ）
6. iron-session でセッションCookieを設定

**セッションデータ:**
```typescript
interface SessionData {
  userId: string;       // users テーブルの UUID
  slackUserId: string;  // Slack user ID
  displayName: string;
  avatarUrl: string;
}
```

**Response:** `302 Redirect` → `/garden`

**エラー時:** `302 Redirect` → `/?error=auth_failed`

### GET /api/auth/logout

セッション破棄。

**処理内容:**
1. iron-session のセッションを破棄

**Response:** `302 Redirect` → `/`

## 3. Supabase クライアント API（フロントエンド）

フロントエンドからのデータ取得はSupabase JSクライアントを使用する。Next.js API Routeを経由せず、直接Supabaseと通信する。

### 盆栽データ取得

```typescript
// 単一ユーザーの盆栽
const { data } = await supabase
  .from('bonsai')
  .select(`
    *,
    users!inner (display_name, avatar_url)
  `)
  .eq('user_id', userId)
  .single();

// 全ユーザーの盆栽（花壇ビュー）
const { data } = await supabase
  .from('bonsai')
  .select(`
    *,
    users!inner (display_name, avatar_url)
  `)
  .order('created_at', { ascending: true });
```

### アクションログ取得（統計ページ）

```typescript
// 日別アクション集計
const { data } = await supabase
  .from('action_log')
  .select('action_type, created_at')
  .eq('user_id', userId)
  .gte('created_at', startDate)
  .order('created_at', { ascending: true });
```

### Realtime 購読

```typescript
// 盆栽テーブルの変更をリアルタイム購読
const channel = supabase
  .channel('bonsai-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bonsai',
      filter: userId ? `user_id=eq.${userId}` : undefined,
    },
    (payload) => {
      // payload.new に更新後のデータ
    }
  )
  .subscribe();
```

## 4. Supabase Row Level Security (RLS)

### ポリシー方針

| テーブル | SELECT | INSERT | UPDATE |
|---------|--------|--------|--------|
| users | 認証済みユーザー: 全行読み取り可 | サービスロールのみ | サービスロールのみ |
| bonsai | 認証済みユーザー: 全行読み取り可 | サービスロールのみ | サービスロールのみ |
| action_log | 認証済みユーザー: 自分のログのみ | サービスロールのみ | なし（追記専用） |
| growth_rules | 認証済みユーザー: 全行読み取り可 | サービスロールのみ | サービスロールのみ |

- フロントエンドからの読み取りは `anon key` + RLS で制御
- Slack Webhook からの書き込みは `service_role key`（API Route 内のみ使用、フロントエンドに露出しない）

## 5. ページ一覧とデータフロー

| ページ | パス | データ取得方法 | Realtime |
|-------|------|-------------|----------|
| ランディング | `/` | なし | なし |
| 花壇 | `/garden` | 全bonsai + users (SSR + Realtime) | 全bonsaiのUPDATE購読 |
| 個別盆栽 | `/bonsai/[userId]` | 単一bonsai + users (SSR + Realtime) | 該当bonsaiのUPDATE購読 |
| 自分の盆栽 | `/bonsai/me` | セッションからuserId取得 → リダイレクト | なし |
| 統計 | `/stats` | action_log 集計 (CSR) | なし |
