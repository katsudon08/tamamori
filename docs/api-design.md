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
2. リクエストボディを Zod スキーマでバリデーション（`slack-event-schema.ts`）
3. `event_id` で冪等性チェック（`action_log.slack_event_id` と照合）
4. `channel` が `SLACK_WATCHED_CHANNELS` に含まれるか確認
5. `subtype` が null の通常メッセージのみ処理（bot メッセージ、編集等は除外）
6. ユーザー upsert
7. `action_log` に `action_type: "message"` で挿入
8. テキストに感謝キーワードが含まれる場合、追加で `action_type: "thanks"` を挿入
9. `bonsai.total_messages` をインクリメント（+感謝なら `total_thanks` も）
10. 成長ステージ再判定 + `visual_state` 再計算
11. `bonsai` テーブル更新

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

| ケース                     | 対応                                                 |
| -------------------------- | ---------------------------------------------------- |
| 署名検証失敗               | `401 Unauthorized` を返却                            |
| 重複イベント（冪等性違反） | 処理をスキップし `200 OK` を返却                     |
| 監視対象外チャンネル       | 処理をスキップし `200 OK` を返却                     |
| DB書き込みエラー           | ログ出力。`200 OK` を返却（Slackのリトライに委ねる） |

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

1. クエリパラメータを Zod スキーマでバリデーション（`slack-oauth-schema.ts`）
2. `state` パラメータをセッション保存値と照合（CSRF対策）
3. `code` を使って Slack の `openid.connect.token` API でトークン交換
4. トークンレスポンスを Zod スキーマでバリデーション
5. トークンから `user_id`, `team_id`, `name`, `picture` を取得
6. `users` テーブルに upsert
7. `bonsai` レコードが未存在なら作成（初期状態: seed ステージ）
8. iron-session でセッションCookieを設定

**セッションデータ:**

```typescript
interface SessionData {
    userId: string; // users テーブルの UUID
    slackUserId: string; // Slack user ID
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

クライアント側ではログアウトボタン (`<LogoutButton>`) が `clearSessionToken()` を
呼んだ後にこの URL へ navigation する。完全なページ遷移により Realtime hook の
WebSocket / Supabase client インスタンスは破棄される。

### GET /api/auth/session-token

iron-session 由来の独自 JWT (Supabase RLS 用 / HS256) を都度ミントして返す
(#75 / [ADR-004](adr/004-custom-jwt-for-rls.md))。cookie には載せない。

**処理内容:**

1. `getSession()` で iron-session を読む
2. `isAuthenticated` (= `userId` / `slackTeamId` 共に非空) を確認
3. 認証済みなら `issueSupabaseJwt({ userId, slackTeamId, slackUserId })` を呼んで JSON で返す

**Request:** GET `/api/auth/session-token` (same-origin cookie 付与必須)

**Response (認証済み): `200 OK`**

```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1745308800
}
```

**Response (未認証 / セッション復号失敗): `401 Unauthorized`**

```json
{ "token": null, "reason": "unauthenticated" }
```

**Response (発行失敗 — 鍵未設定など): `500 Internal Server Error`**

```json
{ "token": null, "reason": "server_error" }
```

**全レスポンス共通ヘッダ:**

| ヘッダ                   | 値                  | 目的                                        |
| ------------------------ | ------------------- | ------------------------------------------- |
| `Cache-Control`          | `private, no-store` | 中間 proxy / ブラウザキャッシュへの保存防止 |
| `X-Content-Type-Options` | `nosniff`           | MIME sniffing 抑制                          |
| `Vary`                   | `Cookie`            | cookie 違いでレスポンスが変わる旨を明示     |

**JWT claims:**

```jsonc
{
    "sub": "<users.id (UUID)>",
    "role": "authenticated",
    "slack_team_id": "<Txxxxxx>", // RLS で auth.jwt() ->> 'slack_team_id' で参照
    "slack_user_id": "<Uxxxxxx>",
    "aud": "authenticated",
    "iss": "tamamori",
    "iat": 1745305200,
    "exp": 1745308800, // iat + 3600 (TTL 1 時間)
    "jti": "<random uuid>",
}
```

`userId` / `slackTeamId` / `slackUserId` は **session からのみ** 取得する。
リクエスト body や query には依存しない (ここを破ると IDOR に戻る)。

## 3. Supabase クライアント API（フロントエンド）

フロントエンドからのデータ取得はSupabase JSクライアントを使用し、**SWR** でキャッシュ管理を行う。Next.js API Routeを経由せず、直接Supabaseと通信する。

### SWR フック定義（entities層）

各エンティティの `api/` セグメントに SWR フックを定義する。

```typescript
// entities/bonsai/api/bonsai-api.ts
import useSWR from 'swr';
import { createClient } from '@/shared/lib/supabase/client';

const supabase = createClient();

// 単一ユーザーの盆栽
export function useBonsai(userId: string | undefined) {
    return useSWR(userId ? ['bonsai', userId] : null, async ([, id]) => {
        const { data, error } = await supabase
            .from('bonsai')
            .select(
                `
          *,
          users!inner (display_name, avatar_url)
        `,
            )
            .eq('user_id', id)
            .single();
        if (error) throw error;
        return data;
    });
}

// 全ユーザーの盆栽（花壇ビュー）
export function useAllBonsai() {
    return useSWR('all-bonsai', async () => {
        const { data, error } = await supabase
            .from('bonsai')
            .select(
                `
          *,
          users!inner (display_name, avatar_url)
        `,
            )
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    });
}
```

```typescript
// entities/action/api/action-api.ts
import useSWR from 'swr';
import { createClient } from '@/shared/lib/supabase/client';

const supabase = createClient();

// 日別アクション集計（統計ページ）
export function useActionLogs(userId: string | undefined, startDate: string) {
    return useSWR(userId ? ['action-logs', userId, startDate] : null, async ([, id, start]) => {
        const { data, error } = await supabase
            .from('action_log')
            .select('action_type, created_at')
            .eq('user_id', id)
            .gte('created_at', start)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
    });
}
```

### SSR初期データの注入

SSRページでは `SWRConfig` の `fallback` でサーバー取得データを注入し、初回レンダリングでのデータ表示を即座に行う。

```typescript
// src/app/(pages)/garden/page.tsx
import { SWRConfig } from 'swr';
import { createClient } from '@/shared/lib/supabase/server';
import { GardenViewer } from '@/widgets/garden-viewer';

export default async function GardenPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('bonsai')
    .select('*, users!inner (display_name, avatar_url)')
    .order('created_at', { ascending: true });

  return (
    <SWRConfig value={{ fallback: { 'all-bonsai': data } }}>
      <GardenViewer />
    </SWRConfig>
  );
}
```

### Realtime 購読 + SWR キャッシュ更新

Supabase Realtime のコールバック内で SWR の `mutate()` を使用してキャッシュを更新し、Three.js シーンの再レンダリングをトリガーする。

```typescript
// features/realtime-sync/model/use-bonsai-realtime.ts
import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { createClient } from '@/shared/lib/supabase/client';

const supabase = createClient();

export function useBonsaiRealtime(userId?: string) {
    const { mutate } = useSWRConfig();

    useEffect(() => {
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
                    // 特定盆栽のキャッシュを更新
                    if (payload.new.user_id) {
                        mutate(['bonsai', payload.new.user_id]);
                    }
                    // 全盆栽リストのキャッシュも更新
                    mutate('all-bonsai');
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, mutate]);
}
```

## 4. Supabase Row Level Security (RLS)

### ポリシー方針 (#75 / [ADR-004](adr/004-custom-jwt-for-rls.md))

`iron-session` 由来の独自 JWT (HS256 / `slack_team_id` claim) を `authenticated`
ロールで流し、自テナント行のみ SELECT を許可する。書き込みはアプリ層の
`service_role` 経由のみ行うためポリシーを追加しない (= デフォルト DENY)。

| テーブル     | SELECT (authenticated)                           | INSERT             | UPDATE             |
| ------------ | ------------------------------------------------ | ------------------ | ------------------ |
| users        | `slack_team_id = auth.jwt() ->> 'slack_team_id'` | サービスロールのみ | サービスロールのみ |
| bonsai       | `slack_team_id = auth.jwt() ->> 'slack_team_id'` | サービスロールのみ | サービスロールのみ |
| action_log   | `slack_team_id = auth.jwt() ->> 'slack_team_id'` | サービスロールのみ | なし（追記専用）   |
| growth_rules | `USING (true)` — テナント非依存                  | サービスロールのみ | サービスロールのみ |

**設計原則:**

- ポリシーは **自テーブルの `slack_team_id` を直接参照**する。`users` JOIN や
  EXISTS は postgres_changes RLS で評価できないため使わない (PoC で実証済み)。
- フロントエンドからの読み取りは `anon key` + 独自 JWT (`accessToken` 関数オプション)
  で `authenticated` ロールに昇格。
- Slack Webhook からの書き込みは `service_role key`（API Route 内のみ使用、
  フロントエンドに露出しない / RLS バイパス）。

### マルチテナント認可（多層防御）

#74 のアプリ層フィルタは #75 RLS と並走させて維持する。`service_role` 経路は
RLS をバイパスするため、アプリ層が唯一の防御となる。

- セッション (`iron-session`) に `slackTeamId` を保持し、OAuth callback (`/api/auth/slack/callback`) で Slack Identity から取得した値をセット
- bonsai 取得クエリは `bonsai.slack_team_id` 直接参照で絞り込む (`users!inner` JOIN は
  display_name/avatar_url 表示用に維持)。RLS ポリシーと同じ列を参照することで
  「アプリ層フィルタと RLS の意図が一致する」状態を作る
    - 対象: SSR (`src/app/(pages)/*/page.tsx`)・クライアント SWR (`src/entities/bonsai/api/bonsai-swr.ts`)・entities API (`getBonsaiByUserId`)
- `/bonsai/[userId]` は他テナントの userId へのアクセスに対して `notFound()` で 404 を返す（存在情報を漏らさない）
- Slack Event 処理 (`processSlackEvent`) は team-aware lookup で別テナントを早期 return

### Realtime + RLS の必須要件 (#75 / PoC 由来)

- **subscribe 前に `await supabase.realtime.setAuth(jwt)` を呼ぶ** (auto-setAuth
  は race するため依存しない)
- **`bonsai` / `action_log` を `REPLICA IDENTITY FULL`** に設定 (DEFAULT では
  WAL に必要なカラムが乗らず RLS 評価できない)
- 購読 filter に `slack_team_id=eq.${slackTeamId}` を付与し、RLS との二重防御
  (`useAllBonsaiRealtime`)。`useBonsaiRealtime` は `user_id=eq.${userId}` 単独でも
  `bonsai.user_id` UNIQUE のため一意
- ページ共通レイアウト (`src/app/(pages)/layout.tsx`) は `session.slackTeamId` が空のとき `/` にリダイレクト（旧セッション cookie のユーザーに再ログインを促す）

**注意**: Supabase Realtime 購読（`use-bonsai-realtime.ts`, `use-all-bonsai.ts`）は現段階ではテナントフィルタを適用していない。Realtime 起点の再検証は SWR fetcher 側のテナントフィルタで空結果になるため情報漏洩は発生しないが、購読そのもののスコープ制限は #75 の RLS + カスタム JWT で抜本対応する。

## 5. ページ一覧とデータフロー

| ページ       | パス               | データ取得方法                                      | Realtime               |
| ------------ | ------------------ | --------------------------------------------------- | ---------------------- |
| ランディング | `/`                | なし                                                | なし                   |
| 花壇         | `/garden`          | `useAllBonsai()` (SSR fallback + SWR + Realtime)    | 全bonsaiのUPDATE購読   |
| 個別盆栽     | `/bonsai/[userId]` | `useBonsai(userId)` (SSR fallback + SWR + Realtime) | 該当bonsaiのUPDATE購読 |
| 自分の盆栽   | `/bonsai/me`       | セッションからuserId取得 → リダイレクト             | なし                   |
| 統計         | `/stats`           | `useActionLogs(userId, startDate)` (SWR CSR)        | なし                   |
