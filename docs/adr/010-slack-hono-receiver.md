# ADR-010: Slack 連携を Bolt のカスタムレシーバで Hono に統合する

## Status

Accepted

## Context

apps/api は Hono を HTTP フレームワークに採用し、Cloud Run（コンテナ）で動かす。Cloud Run は**単一の `PORT` を listen する契約**で、複数インスタンスにスケールしうる。

一方、Slack 連携には次が必要である。

- Slack Events API の受信（署名検証・イベントハンドリング）。
- マルチテナントの **OAuth インストール**と、bot トークンの保管・取り出し（**InstallationStore**）（[ADR-009](009-auth-architecture.md) 層1）。

Slack Bolt はこれらを標準機能として提供するが、**既定のレシーバ（Express 系）は独自に HTTP サーバを立てる**ため、Hono と同居させて単一ポートで動かす構成では衝突し、Cloud Run の PORT 契約で問題になりやすい（bolt-js の既知の課題）。

## Decision

Slack Bolt を **Hono の custom receiver** としてマウントし、**単一プロセス・単一ポート**で以下を Bolt に担わせる。

- Slack Events の受信・署名検証・イベントルーティング
- OAuth インストールフロー（`GET /slack/install` / `GET /slack/install/callback`）
- InstallationStore（bot トークン等の保管・取り出し。ストアは Postgres の `slack_installations`）

HTTP API（`/api/*`）と利用者認証（`/auth/*`、[ADR-009](009-auth-architecture.md) 層3）は Hono 側で扱い、同一の Hono アプリ上に Bolt のルートを合流させる。

## Consequences

### Positive

- 単一ポート・単一プロセスで Cloud Run の契約に適合する。
- Bolt のマルチテナント OAuth / InstallationStore を活用でき、bot トークン管理を自前実装せずに済む。
- HTTP API・Slack 受信・インストールが 1 つの Hono アプリに集約され、デプロイが単純。

### Negative

- Bolt を Hono の custom receiver に統合する結合コードが必要（Bolt のバージョン追従も要る）。
- Bolt の抽象に依存する分、受信処理の細部を Bolt の流儀に合わせる必要がある。

## Alternatives

### Bolt を使わず Hono ルート＋@slack 署名検証

- `@slack/*` の署名検証だけを使い、Events を Hono ルートで直接処理する。依存は減るが、**OAuth インストール・InstallationStore を自前実装**する必要があり、マルチテナントでは手間が増える。将来 Bolt 依存を外したくなった場合の退避先とする。

### Bolt を別ポート / 別サービスで動かす

- Cloud Run の単一ポート契約に反する（別サービス化はデプロイ・コストが増える）。MVP では採用しない。
