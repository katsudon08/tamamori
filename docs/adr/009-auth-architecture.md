# ADR-009: 認証・認可アーキテクチャ

## Status

Accepted

## Context

たま森は Slack を中心とするマルチテナントサービスである（[requirements.md](../requirements.md) §4：どのワークスペースからも受け入れ可能）。認証・認可には次の性質が求められる。

- 任意のワークスペースがアプリを導入し、そのワークスペースの活動イベントを受信できること。
- Slack からの Webhook が本物であることを検証できること。
- web を開いた利用者が誰か・どのチームかを特定し、自分の盆栽を表示し、他チームのデータを見せないこと（テナント分離）。
- マルチテナント SaaS として、アンインストール・利用者の無効化・退職・端末紛失時に**セッションを即時失効**できること。

また、フロント apps/web（Vercel）と apps/api（Cloud Run）は別オリジンで公開される。**Public Suffix List により `*.vercel.app` と `*.run.app` はブラウザが親ドメイン Cookie を拒否する**ため、既定のホスト名同士では Cookie セッションが成立しない。

## Decision

認証・認可を **3 層**で構成する。

1. **ワークスペース接続（マルチテナント install）** — Slack アプリを配布し、任意のワークスペースが **OAuth v2** で導入する。bot スコープを付与し、bot トークンと team を **インストールストア（Postgres）** に保管する。実装は [ADR-010](010-slack-hono-receiver.md)。
2. **リクエスト検証** — Slack Webhook は **signing secret による署名（HMAC）** を検証する。
3. **利用者ログイン** — **Sign in with Slack（OpenID Connect）**。**jose で id_token を JWKS 署名検証**（`iss` / `aud` / `exp` / `nonce`）し、slack_user_id と team_id を取得する。

利用者セッションは **DB ステートフル**とする。Postgres の `sessions` テーブルにセッションを保持し、Cookie には**不透明なランダム session ID** のみを載せる。ログアウトはセッション行の削除で**即時失効**する（利用者無効化＝user 単位削除、テナント退会＝team 単位一括削除）。

クロスオリジンの Cookie は **カスタムドメイン方式**で成立させる。`app.<domain>`（Vercel）/ `api.<domain>`（Cloud Run）を共通の登録可能ドメイン配下に置き、Cookie を `Domain=.<domain>`・`SameSite=Lax`・`Secure`・`HttpOnly` で発行する。

## Consequences

### Positive

- セッションを**即時失効**できる（マルチテナント SaaS の要件を満たす）。
- Cookie は session ID のみのため、Cookie サイズ上限（~4KB）の問題が無い。
- 共有ストア（Postgres）が既にあり、Cloud Run が複数インスタンスでもスティッキー不要・Redis 追加不要。セッション読み取りは既存の DB 接続に相乗りできる。
- api/web が同一登録ドメインの same-site となり、`SameSite=Lax` で web→api の fetch に Cookie が送られ、CORS も単純化される。

### Negative

- カスタムドメインの DNS・TLS 証明書の運用が必要。OAuth コールバック URL が固定ドメインに縛られる。
- bot トークンのインストールストア（暗号化保管）が必要。
- リクエストごとにセッション読み取りが 1 回増える（全 API が元々 DB に触れるため実質影響は小さい）。

## Alternatives

### iron-session 等のステートレス暗号化 Cookie

- session テーブル不要で実装が簡単。一方で満了まで**即時失効できない**ため、アンインストール・無効化・退職に弱い。採用しない（ただし id_token 検証用の jose は本決定でも採用する）。

### 別ドメインのまま SameSite=None + CSRF

- カスタムドメイン不要だが、`SameSite=None` と CSRF 対策・CORS credentials の複雑さが増す。same-site にできる本構成では不利。

### Vercel rewrites で同一オリジン化

- CORS/Cookie 問題は回避できるが、API トラフィックが Vercel を経由し遅延・制約が生じる。

### Better Auth 等の認証フレームワークへ寄せる

- Slack OIDC 内蔵・Drizzle 対応で魅力的だが、アイデンティティが Slack そのもので、[ADR-010](010-slack-hono-receiver.md) の Bolt install 系統と「テナント/ユーザーの真実の源」が二重化しやすい。将来メール / パスワード / MFA を足す計画が出た時点で再検討する。

### Lucia

- 2025 年に非推奨化され、ライブラリではなく実装リファレンスに転換したため採用しない。

### 単一テナント（手動インストール）

- 層1 の OAuth フローを省ける最小構成だが、requirements §4 のマルチテナント要件を満たさない。
