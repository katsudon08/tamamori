# Issue #75 詳細設計レビュー — 議論論点インデックス

Issue #75「IDOR対策 (2/2): RLSによるテナント分離 (カスタムJWT方式)」の詳細設計にあたり、`#74` 実装を前提として詰めるべき論点を整理する。

## 全体の前提

- **#74 完了状態** (merge 済み): アプリ層で `session.slackTeamId` を Root of Trust としたテナント認可が全経路に通っている (SSR・SWR・Entity API・process-event)。Realtime 購読のみ filter-less のまま (`use-all-bonsai.ts`)。
- **#75 のゴール**: DB 層 (RLS) をアプリ層の**最終防衛線**にし、アプリ層のバグや Realtime の抜け道を塞ぐ。方式は **Supabase JWT Secret で HS256 署名した独自 JWT** を `authenticated` ロールとして流す。
- **二系統の認可 Root of Trust**: 読み取り = OAuth callback で確立された iron-session、書き込み = Slack 署名検証。これは #74 から維持。

## 本レビューで先に決定した方針 (ADR-004 骨子)

以下は個別論点に入る前の前提として固定する。詳細は `advice/jwt-server-issuance-spec.md` を参照。

1. **JWT は OAuth callback では発行しない**。サーバAPI (`GET /api/auth/session-token`) が iron-session を読み、その場で HS256 JWT をミントして JSON で返す。
2. **JWT を cookie に載せない**。ブラウザはメモリキャッシュで保持。`localStorage` 禁止。
3. **iron-session (`tamamori_session`) を唯一の Root of Trust** とし、JWT はそこからの派生物。Supabase 側 session cookie は使わない。
4. **JWT TTL = 1時間 / iron-session TTL = 7日**。非対称だが、セッションが生きている限り JWT は自動的にロールオーバーされる。
5. **supabase-js の `accessToken` 関数オプション**を採用 (v2.101.1 で PoC 検証済み — `advice/poc-access-token-result.md`)。
6. **Realtime + RLS を成立させる必須条件 (PoC 由来)**:
    - **subscribe 前に `await supabase.realtime.setAuth(jwt)` を呼ぶ** (auto-setAuth は race するため依存しない)
    - **RLS ポリシーは自テーブルの `slack_team_id` を直接参照する** (JOIN/EXISTS は postgres_changes で機能しない)
    - **`bonsai` / `action_log` を `REPLICA IDENTITY FULL` に設定する** (WAL に必要なカラムを載せる)

## 論点一覧

| #   | タイトル                                                                                       | 粒度 | 重要度 |
| --- | ---------------------------------------------------------------------------------------------- | ---- | ------ |
| 1   | [supabase-js への JWT 注入方式](./01-jwt-delivery.md)                                          | 実装 | 高     |
| 2   | [/api/auth/session-token エンドポイント仕様](./02-session-token-endpoint.md)                   | 実装 | 高     |
| 3   | [Realtime 認証と購読フィルタの二重化](./03-realtime-auth.md)                                   | 実装 | 高     |
| 4   | [スキーマ整合性 (denormalize・複合 FK・immutable・REPLICA IDENTITY)](./04-schema-integrity.md) | DB   | 中     |
| 5   | [マイグレーション分割とロールアウト順序](./05-migration-rollout.md)                            | 運用 | 中     |
| 6   | [#74 アプリ層フィルタとの多層防御整理](./06-layered-defense.md)                                | 設計 | 中     |
| 7   | [Issue タスクリストへの追加タスク](./07-missing-tasks.md)                                      | 棚卸 | 高     |

## 優先して決めたい順序

1. **#1, #2** (supabase-js 注入方式・session-token エンドポイント) — これが決まらないと後段の Supabase client 改修もテストも書けない。**PoC で v2.101.1 の対応を確認済み**。
2. **#4** (スキーマ整合性) — 007 マイグレーションの粒度・REPLICA IDENTITY を決めるため。
3. **#3** (Realtime 認証) — explicit setAuth 必須 / filter 二重化 / token 更新パターンを確定。
4. **#5** (ロールアウト) — 上記 3 点が決まった上でデプロイ計画を詰める。
5. **#6, #7** (多層防御整理・タスク棚卸) — 最終的に Issue 本文の更新 or ADR-004 に反映する取りまとめ。

## 成果物の想定

- `docs/adr/004-custom-jwt-for-rls.md` — 採用方針・代替案棄却理由・**PoC で確定した必須条件**
- Issue #75 本文の差分更新（不足タスク: session-token エンドポイント追加 / Realtime filter / explicit setAuth / REPLICA IDENTITY FULL / callback からの JWT 発行削除）
- `docs/review/75/issue/advice/` — 論点決着後の実装依頼メモ + PoC 結果
