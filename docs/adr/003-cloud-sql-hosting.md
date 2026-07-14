# ADR-003: PostgreSQL のホスティングに Cloud SQL を採用する

## Status

Accepted

## Context

[ADR-001](001-postgresql-adoption.md) で PostgreSQL、[ADR-002](002-drizzle-orm-adoption.md) で Drizzle ORM を決定したが、Postgres を「どこで動かすか」（ホスティング/プロバイダ）が未決だった。apps/api は Cloud Run（サーバーレス）上で動作し、DB へアクセスするのは apps/api のみである。

ホスティングには以下の性質を求める。

- Cloud Run からの低レイテンシ接続と、コールドスタート時の多数接続に耐えるコネクション管理
- `slack_team_id` ベースのテナント分離（RLS + アプリ層認可）が成立すること
- Drizzle / drizzle-kit が使える標準 PostgreSQL であること
- バックアップ・監視・IaC など運用が回ること
- 早期段階のコスト

候補（Supabase / Neon / Cloud SQL / Railway）を6軸（Cloud Run 接続 / Drizzle 互換 / コスト / RLS・認証 / Realtime / 移行・運用）で調査・比較した。全候補が標準 PostgreSQL のため RLS・Drizzle・データ移植性（pg_dump）は共通して満たし、差は「稼働クラウドと Cloud Run の co-location・接続方式・コスト・運用一体性」に出た。Realtime は将来 apps/api の自前 WebSocket へ移行予定のため評価上の重要度は低い。

> **追記（[ADR-004](004-update-delivery-polling.md) 決定後）**: その後 ADR-004 で盆栽更新の反映は **ポーリング**に決定し、WebSocket は不採用となった。上記「自前 WebSocket へ移行予定」は本 ADR 決定時点の前提であり現在は当てはまらない。ただし Realtime の評価上の重要度が低いという結論は、ポーリング採用後もそのまま変わらない（むしろ持続接続を持たないため一層当てはまる）。

## Decision

デプロイ環境（本番・ステージング）の PostgreSQL ホスティングに **Cloud SQL for PostgreSQL** を採用する。

- apps/api（Cloud Run）と **同一 GCP・同一リージョン**に配置し、Cloud SQL Connector（または Auth Proxy サイドカー）＋ IAM 認証で接続する。
- テナント分離は、apps/api が JWT を検証して `slack_team_id` を **セッション変数として注入**し、RLS で多層防御する（DB 側の JWT 連携機構には依存しない）。
- **ローカル開発は Docker の素の PostgreSQL** を用いる（Cloud SQL はマネージドのためローカルでは動かさない）。Cloud SQL は標準 PostgreSQL であり、drizzle-kit の同一マイグレーションでローカル/デプロイ環境のスキーマ整合を保つ。CI も Docker PostgreSQL を用いる。
- 接続は環境変数（`DATABASE_URL` 等）で切り替える。Cloud Run のスケールアウト/コールドスタートに備え、トランザクションプーリング（Managed Connection Pooling 等）を用いる場合は prepared statements を無効化する。

## Consequences

### Positive

- Cloud Run と同一 GCP・同一リージョンのため接続レイテンシが最小で、クロスクラウドのネットワーク区間が無い。
- IAM 認証・Cloud Monitoring・Terraform（`google_sql_database_instance`）が GCP で一体運用でき、apps/api と同じ基盤・権限管理に乗る。
- 標準 PostgreSQL のため RLS・Drizzle・pg_dump がそのまま使え、データ層のロックインは低い。
- ローカル開発が Docker PostgreSQL 単体で完結し、オフライン・無料・軽量。CI も同一手段で再現でき、Supabase CLI スタックに依存しない。

### Negative

- 無料枠が無く常時課金になる（dedicated-core は小規模でも概ね月 $50〜、東京リージョンはさらに高い。shared-core は月 ~$10 だが dev 専用で SLA 無し）。
- 運用面で GCP ロックインが生じる（ただしデータは標準 Postgres で持ち出し可能）。
- Cloud Run は1インスタンスあたり接続数上限（目安 100）があるため、コネクションプーリングの設計が必要。トランザクションプーリング利用時は prepared statements 等の制約に注意する。

## Alternatives

### Supabase

- マネージド PostgreSQL に RLS・auth・storage・realtime が一体で付属し、初期立ち上げが速い。
- 一方で AWS 限定であり Cloud Run（GCP）からは常にクロスクラウド接続になる。auth / storage / realtime 等の Supabase 固有機能へのロックインも抱える。目標構成（apps/api が DB の唯一のアクセス者・GCP 一体）との整合を優先し、採用しない。

### Neon

- 純従量・月額下限なし・scale-to-zero で低トラフィック時のコストが最小。
- 一方で AWS に東京リージョンが無く GCP からのレイテンシで不利、scale-to-zero が Cloud Run のコールドスタートと重畳しうる、公式 Terraform Provider が無い。レイテンシと運用一体性を優先し、採用しない。

### Railway

- シンプルで小コスト（Hobby 最低 $5/月）。
- 一方で public TCP Proxy 経由のクロスクラウド接続で、運用・IaC・RLS のプラットフォーム保証が弱く、本番志向の機能が薄い。採用しない。
