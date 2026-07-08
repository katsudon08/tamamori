# API 設計

> apps/api が提供する API の仕様。apps/web 向けの HTTP API、利用者ログイン（OIDC）、Slack のインストール（OAuth）と Events 受信を定義する。技術スタックは [architecture.md](architecture.md)、認証の全体像は [architecture.md](architecture.md) §9・[ADR-009](adr/009-auth-architecture.md) / [ADR-010](adr/010-slack-hono-receiver.md)、レスポンスに載る値の意味は [glossary.md](glossary.md)、保存データは [db.md](db.md) を参照。

## 1. 共通事項

apps/api は、apps/web と Slack の間に立つ独立した API サーバーである。MVP では次を扱う。

- **apps/web 向け HTTP API** — 盆栽状態の取得（初期表示・ポーリング）。
- **利用者ログイン（OIDC）** — Sign in with Slack。
- **Slack インストール（OAuth）** — マルチテナントの導入。
- **Slack Events API Webhook** — Slack 上の活動イベントの受信。

### 1.1 認証・認可（3 層）

詳細は [architecture.md](architecture.md) §9 / [ADR-009](adr/009-auth-architecture.md)。

| 層 | 対象 | 方式 |
| --- | --- | --- |
| 1. ワークスペース接続 | `/slack/install*` | **OAuth v2 インストール**（bot スコープ）。bot トークンを InstallationStore（Postgres）へ保管 |
| 2. リクエスト検証 | `/api/slack/events` | Slack リクエストの**署名検証**（signing secret の HMAC） |
| 3. 利用者ログイン | `/auth/*`・`/api/bonsai/*` | **Sign in with Slack（OIDC）** → **jose で id_token 検証** → **DB セッション** |

- **セッション**: Postgres `sessions` にステートフルに保持し、Cookie には**不透明な session ID** のみを載せる（`Domain=.<domain>`・`SameSite=Lax`・`Secure`・`HttpOnly`）。ログアウト＝セッション行削除で**即時失効**。
- **認可**: 認証済みユーザーは自分の盆栽と自チームのメンバー一覧のみ取得できる。他チームのデータは取得できない（テナント分離。[db.md](db.md) §5）。
- **クロスオリジン**: web / api は共通登録ドメイン配下のカスタムドメイン（same-site）。CORS は `credentials: include` ＋ origin allowlist。状態変更系は CSRF 対策（OAuth `state`・Origin 検証等）。
- **別フロー**: インストール（層1・bot スコープ）とサインイン（層3・OIDC スコープ）は **別々の OAuth フロー**（Slack の scope conflict のため混在不可）。
- **install ゲーティング**: サインイン時、`id_token` の team_id に対応する installation が無ければ**セッションを発行しない**（インストール済みワークスペースのメンバーのみ利用可）。詳細は [ADR-011](adr/011-tenant-provisioning-lifecycle.md)。

### 1.2 データアクセス

- apps/web は DB へ直接アクセスしない。apps/api を通じて盆栽状態を取得する。
- DB へアクセスするのは apps/api のみとする。

### 1.3 エラー形式

apps/web 向け API のエラーは、HTTP ステータスと次の JSON で表す。

```jsonc
{ "error": { "code": "unauthorized", "message": "認証が必要です" } }
```

| HTTP | `code` | 意味 | 主な発生条件 |
| --- | --- | --- | --- |
| 401 | `unauthorized` | 認証が必要 | 未認証（セッション無効）でアクセスした |
| 403 | `forbidden` | 認可エラー | 他チームのデータを要求した |
| 404 | `not_found` | 対象が存在しない | 対象の盆栽状態が無い |

### 1.4 更新の反映（ポーリング）

盆栽状態の更新に専用エンドポイントは設けない。apps/web が `GET /api/bonsai/me` / `GET /api/bonsai/team` を **TanStack Query の `refetchInterval`（目安 30〜60 秒）** で再取得して反映する。

- レスポンス形式は初期表示時と同一。
- 取得に失敗しても、次回のポーリングで最新状態を再取得できる（持続接続を持たないため再接続処理は不要）。

方式の詳細は [ADR-004](adr/004-update-delivery-polling.md) を参照。

## 2. エンドポイント一覧

| Method | Path | 概要 | 認証 |
| --- | --- | --- | --- |
| GET | `/slack/install` | Slack アプリのインストール開始（配布） | 公開 |
| GET | `/slack/install/callback` | インストールの OAuth コールバック | Slack OAuth（`state`） |
| GET | `/auth/login` | Sign in with Slack 開始 | 公開 |
| GET | `/auth/callback` | サインインの OIDC コールバック | Slack OIDC（`state`/`nonce`） |
| POST | `/auth/logout` | ログアウト（セッション削除） | セッション |
| GET | `/api/bonsai/me` | 自分の盆栽状態を取得する | セッション |
| GET | `/api/bonsai/team` | チームメンバーの盆栽一覧を取得する | セッション |
| POST | `/api/slack/events` | Slack Events API のイベントを受信する | Slack 署名検証 |
| GET | `/healthz` | ヘルスチェック（Cloud Run probe） | 公開 |

インストール（層1）と Events 受信（層2）は Bolt を Hono に統合して扱う（[ADR-010](adr/010-slack-hono-receiver.md)）。

## 3. 盆栽状態レスポンスの構造

apps/web は受け取った値を描くだけのビューアであり、盆栽の描画入力はすべて apps/api が算出（調理）してレスポンスに載せる。生のカウント（発言数・リアクション数・感謝数）や活動量（`activity_score`）はサーバ計算のための内部値であり、**レスポンスには含めない**。

レスポンスは、シーン共通の環境（`season`）と、盆栽ごとの情報（`user` / `render`）で構成する。各値の定義は [glossary.md](glossary.md) §3、見た目の意味は [visual.md](visual.md) を参照。

| フィールド | 位置 | 型 | 説明 |
| --- | --- | --- | --- |
| `season` | 最上位 | `spring`/`summer`/`autumn`/`winter` | 季節。シーン共通（全員同じ）。サーバがレスポンス時刻（基準TZ=JST）から導出。保存しない。 |
| `user.id` | `user` | string (uuid) | ユーザー ID |
| `user.displayName` | `user` | string | 表示名 |
| `user.avatarUrl` | `user` | string | アイコン画像 URL |
| `render.stage` | `render` | integer (1..6) | 成長段階の序数。`bonsai_states.stage` をそのまま載せる。 |
| `render.seed` | `render` | integer | 個体差シード。`user_id` から決定論的に算出。保存しない。 |
| `render.vitality` | `render` | number (0..1) | 活力。`now - last_active_at` の減衰で算出。未活動でも穏やかな下限値を返す。保存しない。 |

`stage` の序数と名前ラベル（実生 / 若木 / 幹の成長 / 仕立て / 成熟 / 風格）の対応、および成長ルール（重み・閾値）は apps/api のコード定数を単一の正とする（[visual.md](visual.md) §2.1・[ADR-006](adr/006-growth-rules-as-code.md)）。

## 4. エンドポイント詳細

### 4.1 認証フロー

#### インストール（層1）

- **`GET /slack/install`**: Slack の認可画面へリダイレクト（bot スコープ・`state` 付き）。
- **`GET /slack/install/callback`**: `code` を bot トークンに交換し、team とともに InstallationStore（`slack_installations`）へ保存する。以降そのワークスペースの Events を受信できる。

#### サインイン（層3）

- **`GET /auth/login`**: Sign in with Slack（OIDC）の認可画面へリダイレクト（`openid`/`profile` スコープ・`state`/`nonce` 付き）。
- **`GET /auth/callback`**: `code` を id_token に交換し、**jose で JWKS 署名検証**（`iss`/`aud`/`exp`/`nonce`）。slack_user_id + team_id を取得して users/teams へマップし、**DB セッションを発行**（`Set-Cookie: <session_id>`）。
- **`POST /auth/logout`**: セッション行を削除して即時失効（Cookie も破棄）。

### 4.2 `GET /api/bonsai/me`

自分の盆栽状態を取得する。

- **パラメータ**: なし（対象ユーザーは認証セッションから決定）。
- **レスポンス（200）**: `season` ＋ 自分の `user` ＋ 自分の `render`。

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

- **エラー**: `401 unauthorized`（未認証）。

### 4.3 `GET /api/bonsai/team`

同じチームに所属するメンバーの盆栽一覧を取得する。

- **パラメータ**: なし（対象チームは認証セッションから決定）。
- **レスポンス（200）**: `season` ＋ `team`（`id` / `name`）＋ `members`（各メンバーの `user` と `render` の配列）。

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

- **エラー**: `401 unauthorized`（未認証）。他チームのデータは取得できない（テナント分離により自チームのみ返す）。

### 4.4 `POST /api/slack/events`

Slack Events API の HTTP Request URL として利用する。処理の流れ（署名検証 → 重複確認 → 変換 → 保存 → 更新）は [architecture.md](architecture.md) §8.2 のシーケンス図を参照。

- **リクエスト**: Slack Events API のイベント payload（JSON）。署名は `X-Slack-Signature` / `X-Slack-Request-Timestamp` ヘッダで検証する。
- **URL 検証**: `type: "url_verification"` のリクエストには `challenge` 値をそのまま返す。
- **レスポンス**: 受理時は速やかに `200 OK` を返す（重い処理で応答を遅らせない）。署名検証に失敗したイベントは処理せず破棄する。
- **リトライ**: Slack は 3 秒以内に 2xx が返らないと再送する（`X-Slack-Retry-Num` 付き）。重複は `slack_event_id` の冪等性で吸収する（[db.md](db.md) §4）。

補足:

- メッセージ本文は、感謝表現の検出にのみ使用し、**保存しない**。
- Slack 固有のイベント形式は、そのまま活動ログとして保存しない（内部の活動イベントへ変換する）。

### 4.5 `GET /healthz`

Cloud Run の startup / liveness probe 用。依存（DB 等）の簡易確認を行い `200 OK` を返す。

## 5. Slack アプリ設定

Slack アプリの設定（スコープ・購読イベント）は App Manifest で管理し、docs で要求内容を明示する。

### スコープ

| 種別 | スコープ | 用途 |
| --- | --- | --- |
| bot（インストール・層1） | `channels:history` | 公開チャンネルのメッセージ受信（感謝表現の検出に本文を読む。本文は保存しない） |
| bot | `reactions:read` | リアクションイベントの受信 |
| bot | `users:read` | 表示名・アイコンの取得 |
| OIDC（サインイン・層3） | `openid` / `profile` | 利用者の識別（slack_user_id / team_id / 表示名） |

### 購読イベント（Events API）

- `message.channels`（公開チャンネルのメッセージ投稿）
- `reaction_added`（リアクション追加）
- `app_uninstalled`（アンインストール検知）※`tokens_revoked` は任意で補助

### アンインストール処理

`app_uninstalled` を受けてテナントの後始末を行う。**Bolt for JavaScript は `deleteInstallation` を自動実行しない**ため、自前で購読・処理する。両イベント（`app_uninstalled`/`tokens_revoked`）の到達順は保証されないため、**順序非依存・冪等**に実装する。処理内容（トークン/セッション即時破棄・育成データの猶予付き削除）は [db.md](db.md) §5・[ADR-011](adr/011-tenant-provisioning-lifecycle.md) を参照。

### その他

- **App Manifest**: `oauth_config.scopes`（bot / OIDC）と `settings.event_subscriptions` を manifest 化し、設定を再現・レビュー可能にする。
- **Request URL**: Events は `POST /api/slack/events`、インストールは `GET /slack/install/callback`。

## 6. エラー設計（まとめ）

- **apps/web 向け API**: §1.3 の形式で `401` / `403` / `404` を返す。
- **Slack Webhook**: 署名検証に失敗したイベントは処理しない。重複イベントは盆栽状態を重複更新しない。処理中のエラーは原因を追えるようログに残す。
- **認証フロー**: OAuth / OIDC の `state` 不一致・id_token 検証失敗は認証エラーとして中断する。
- **ポーリング**: 取得に失敗しても apps/web は次回のポーリングで回復する（再接続処理は不要）。

## 関連リンク

- [architecture.md](architecture.md) — システム構成・認証（§9）・データフロー（§8.2）
- [db.md](db.md) — 保存データ・重複防止・テナント分離・`slack_installations`・`sessions`
- [visual.md](visual.md) — `stage` / `seed` / `vitality` / `season` の見た目
- [glossary.md](glossary.md) — 用語集
