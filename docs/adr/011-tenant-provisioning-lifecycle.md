# ADR-011: マルチテナントのプロビジョニングとライフサイクル

## Status

Accepted

## Context

たま森はマルチテナント（[requirements.md](../requirements.md) §4：任意のワークスペースが導入可能）で、[ADR-009](009-auth-architecture.md) の3層認証を採る。テナント（ワークスペース）とユーザーの**作成・参加・退会（アンインストール）**のライフサイクルを定義する必要がある。

Slack 由来の重要な制約:

- **Sign in with Slack（OIDC）のユーザースコープは、bot スコープと同一 OAuth フローに混在できない**（scope conflict）。インストール（bot）とサインイン（OIDC）は別フローになる。
- Slack Bolt for JavaScript は `app_uninstalled` / `tokens_revoked` を受けても **`deleteInstallation` を自動実行しない**（自前でイベント購読・削除が必要）。両イベントの到達順は保証されない。

## Decision

### プロビジョニング

- **インストール（team の create-or-join）**: `oauth.v2.access` 成功（Bolt の `storeInstallation`）を契機に、`teams`（`slack_team_id` で upsert）と `slack_installations`（`team_id` で upsert、bot トークン保管）を**同一トランザクションで upsert**する。初回インストールも再インストールも同一コード（無ければ作成・あれば更新＝参加）。
- **ユーザー**: `(team_id, slack_user_id)` で upsert。**サインイン経路**（OIDC の `id_token` claim `name`/`picture` を一次ソースにプロフィール更新）と**イベント経路**（行の存在保証のみ）の両方で upsert する。未サインインの活動メンバーの表示名・アイコンは `users:read`（`users.info`）で解決する。`display_name`/`avatar_url` はキャッシュ扱い（更新・削除可）。
- **アクセスゲーティング**: サインイン時、`id_token` の team_id に対応する `slack_installations` が無ければ**セッションを発行しない**（インストール済みワークスペースのメンバーのみ利用可）。

### アンインストール／ライフサイクル

- `app_uninstalled` を**自前で購読・処理**する（`tokens_revoked` は任意で補助）。到達順に依存せず、**冪等**（既に削除済みなら no-op）に実装する。
- 処理内容:
  - **即時破棄**: `slack_installations`（bot トークン）と当該 team の `sessions` を削除。
  - **猶予付きソフトデリート**: `teams`（および該当する `users`）に `deleted_at` を打ち、**約30日後に背景ジョブでハード削除**。猶予中の再インストールで復元する。`activity_logs`/`bonsai_states` は `deleted_at` を持たず、ハード削除時に FK の `ON DELETE CASCADE` で連鎖削除される（詳細は [db.md](../db.md) §5.1・§5.3）。
  - **DSR（削除要求）**: 猶予を待たず即時削除するパスを用意する。

### スコープ外（MVP）

- Enterprise Grid の org-wide install は非対応（team 単位のみ）。将来対応時は `slack_installations` に `enterprise_id` 等を追加。
- トークンローテーションは無効（長期 bot トークン）。将来は `bot_refresh_token`/`bot_token_expires_at` を追加。

## Consequences

### Positive

- 初回・再インストールを同一 upsert で扱え、退会後の再インストールで状態を復元できる。
- トークン・セッションは即時破棄しつつ、育成データはプライバシー最小化（最終的に削除）と UX（誤操作からの復元）を両立。
- ゲーティングにより「空の体験」やテナント未確立のユーザー行を防ぐ。

### Negative

- bolt-js ではアンインストール処理を自前実装する必要がある（自動ではない）。
- ソフトデリートのため `deleted_at` の考慮と背景削除ジョブが要る。
- `users:read` によりスコープがやや広がる（未サインインメンバーの表示のため受容）。

## Alternatives

- **即時ハード削除**: 「保存しない」に最も忠実だが、再インストールでの復元不可・誤操作に弱い。DSR パスとしては採用するが既定にはしない。
- **データ保持**: 復元容易だが保存最小化に反する。
- **ゲーティング無し**: 未インストール WS のユーザーもログイン可能だが、機能が動かず空の体験になる。
- **プロフィールを OIDC のみ（`users:read` 無し）**: 最小スコープだが、未サインインの活動メンバーの名前・アイコンが出せずチーム一覧が不完全になる。
- **Enterprise Grid を今すぐ対応**: 複雑さが増し MVP 速度に見合わない。
