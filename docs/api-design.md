# API設計

## 1. API概要

apps/apiは、apps/webとSlackの間に立つ独立したAPIサーバーである。

MVPでは、以下の2種類のAPIを扱う。

- apps/web向けHTTP API
- Slack Events API Webhook

初期表示・更新反映ともにHTTP APIで行う。apps/webは初期表示で現在の盆栽状態を取得し、その後は同じエンドポイントを一定間隔でポーリングして最新状態を反映する（更新反映の方式は [ADR-004](adr/004-update-delivery-polling.md) を参照）。
Slack上の活動は、Slack Events API Webhookで受信する。

## 2. 認証・認可

### apps/web向けAPI

- 認証方式は未定とする。
- 認証済みユーザーは、自分の盆栽状態を取得できる。
- 認証済みユーザーは、同じチームに所属するメンバーの盆栽一覧を取得できる。
- 他チームの盆栽状態は取得できない。

### Slack Webhook

- Slackからのリクエストは署名検証を行う。
- 署名検証に失敗したイベントは処理しない。
- Slackイベントの再送に備えて、同一イベントを重複処理しない。

### データアクセス

- apps/webはDBへ直接アクセスしない。
- apps/webはapps/apiを通じて盆栽状態を取得する。
- apps/apiのみがDBへアクセスする。

## 3. エンドポイント一覧

### HTTP API

| Method | Path               | 用途                               |
| ------ | ------------------ | ---------------------------------- |
| GET    | `/api/bonsai/me`   | 自分の盆栽状態を取得する           |
| GET    | `/api/bonsai/team` | チームメンバーの盆栽一覧を取得する |

初期表示・ポーリングのいずれもこの2つのGETを利用する（更新専用のエンドポイントは設けない）。

### Slack Webhook

| Method | Path                | 用途                                 |
| ------ | ------------------- | ------------------------------------ |
| POST   | `/api/slack/events` | Slack Events APIのイベントを受信する |

## 4. リクエスト・レスポンス

### 盆栽状態

apps/webは受け取った値を描くだけのビューアであり、盆栽の描画入力はすべてapps/apiが生成（調理）してレスポンスに載せる。発言数・リアクション数・感謝数や活動量（`activity_score`）はサーバ計算のための内部値であり、レスポンスには含めない。

盆栽状態レスポンスは、シーン共通の環境プロパティ（`season`）と、盆栽ごとの情報（`user` / `render`）で構成する。

- `season` — 季節。シーン共通（チーム全員が同じ）なため、レスポンスの最上位に置く。サーバがレスポンス時刻（基準TZ=JST）から導出する。保存しない。
- `user` — ユーザー情報。
  - `id` — ユーザーID
  - `displayName` — 表示名
  - `avatarUrl` — アイコン画像URL
- `render` — 盆栽ごとの描画入力。すべてサーバが調理する。
  - `stage` — 成長段階の序数（1..6）。`bonsai_states.stage` をそのまま載せる。
  - `seed` — 個体差シード。`user_id` から決定論的に算出（hash）する。保存しない。
  - `vitality` — 活力（0..1）。`now - last_active_at` の減衰関数で算出する。`last_active_at` が未設定（未活動）でも穏やかな下限値を返し、枯れさせない。保存しない。

`stage` の序数と名前（実生 / 若木 / 幹の成長 / 仕立て / 成熟 / 風格）・見た目パラメータの対応は apps/api が持つ（詳細は [visual-design.md](visual-design.md)）。成長ルール（重み・閾値）も apps/api のコード定数を単一の正とする。

### `GET /api/bonsai/me`

自分の盆栽状態を取得する。

レスポンス:

- `season` — シーン共通の季節
- `user` — 自分のユーザー情報
- `render` — 自分の盆栽の描画入力（`stage` / `seed` / `vitality`）

```jsonc
{
  "season": "summer",
  "user": {
    "id": "a1b2c3d4-e5f6-4789-9abc-def012345678",
    "displayName": "松原",
    "avatarUrl": "https://example.com/avatars/matsubara.png"
  },
  "render": { "stage": 5, "seed": 2847123, "vitality": 0.82 }
}
```

### `GET /api/bonsai/team`

同じチームに所属するメンバーの盆栽一覧を取得する。

レスポンス:

- `season` — シーン共通の季節
- `team` — チーム情報（`id` / `name`）
- `members` — チームメンバーごとの `user` と `render` の配列

```jsonc
{
  "season": "summer",
  "team": { "id": "3f9c0e1a-7b2d-4c5e-9f10-aaaaaaaaaaaa", "name": "Tamable" },
  "members": [
    {
      "user": { "id": "a1b2c3d4-…-345678", "displayName": "松原", "avatarUrl": "…" },
      "render": { "stage": 5, "seed": 2847123, "vitality": 0.82 }
    },
    {
      "user": { "id": "b2c3d4e5-…-456789", "displayName": "田中", "avatarUrl": "…" },
      "render": { "stage": 2, "seed": 9931002, "vitality": 0.10 }
    }
  ]
}
```

### `POST /api/slack/events`

Slack Events APIのHTTP Request URLとして利用する。

主な処理:

1. Slackリクエストの署名を検証する。
2. Slackイベントの重複を確認する。
3. Slackイベントを内部の活動イベントへ変換する。
4. 活動ログを保存する。
5. 盆栽状態を更新する。

補足:

- メッセージ本文は、感謝表現の検出にのみ使用する。
- メッセージ本文は保存しない。
- Slack固有のイベント形式は、そのまま活動ログとして保存しない。

### 更新の反映（ポーリング）

盆栽状態の更新は専用APIを設けず、apps/webが `GET /api/bonsai/me` / `GET /api/bonsai/team` を一定間隔で再取得して反映する。

- レスポンス形式は初期表示時と同一。
- 取得に失敗しても、次回のポーリングで最新状態を再取得できる（持続接続を持たないため再接続処理は不要）。

詳細は [ADR-004](adr/004-update-delivery-polling.md) を参照。

## 5. エラー設計

### apps/web向けAPI

- 認証されていない場合は、認証エラーを返す。
- 他チームのデータを要求した場合は、認可エラーを返す。
- 対象データが存在しない場合は、未検出エラーを返す。

### Slack Webhook

- Slack署名検証に失敗した場合は、イベントを処理しない。
- 重複イベントを受信した場合は、盆栽状態を重複更新しない。
- 処理中にエラーが発生した場合は、原因を追えるようにログを残す。

### 更新の反映（ポーリング）

- ポーリングでの取得に失敗しても、apps/webは次回のポーリングで最新状態を再取得する（持続接続を持たないため再接続は不要）。
