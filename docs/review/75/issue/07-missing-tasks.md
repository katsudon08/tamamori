# 論点 7: Issue タスクリストへの追加タスク

論点 #1〜#6 を経て、**現 Issue #75 のタスクリストに不足している項目**を棚卸する。サーバAPI 発行方式採用に伴い、当初 Issue 本文の「callback で JWT cookie を発行 → ブラウザは cookie を読む」前提のタスクが不要になっている点も整理する。

## 当初案からの主な差分

| 項目                                           | 当初 Issue     | サーバAPI 発行採用後                                 |
| ---------------------------------------------- | -------------- | ---------------------------------------------------- |
| OAuth callback での JWT 発行                   | ✅ あり        | **削除** (callback では iron-session のみセット)     |
| `sb-access-token` httpOnly cookie              | ✅ あり        | **削除** (cookie には載せない)                       |
| `/api/auth/session-token` エンドポイント       | (検討中だった) | **新規追加・必須**                                   |
| `/api/auth/logout` での `sb-access-token` 破棄 | ✅ あり        | **不要** (cookie 自体が無い)                         |
| `createBrowserClient(jwt?)` + `setSession`     | ✅ あり        | **`accessToken` 関数オプション方式に変更** (論点 #1) |
| token-cache (メモリキャッシュ + inflight 制御) | (なし)         | **新規追加・必須**                                   |
| `realtime.setAuth` 呼び出し                    | (なし)         | **追加** (TTL ロールオーバー時)                      |

## カテゴリ別の追加タスク (差分反映後)

### A. 依存パッケージ

- [ ] `package.json` に `jose` を追加 (`npm i jose`)
- [ ] 不要になる: `@supabase/ssr` のブラウザ側利用 (server-side では引き続き使用検討、要確認)

### B. 環境変数

- [ ] `SUPABASE_JWT_SECRET` の Vercel 環境変数追加 (本番・プレビュー)
- [ ] `src/shared/config/env-schema.ts` に Zod で追加
- [ ] ローカル `.env.local.example` 更新

### C. 新設エンドポイント・モジュール

- [ ] **`src/app/api/auth/session-token/route.ts` 新規作成** (論点 #2)
    - iron-session 未認証時は 401 (`{ token: null, reason: "unauthenticated" }`)
    - 認証済み時は **その場で JWT をミント**して `{ token, expiresAt }` で返す
    - `Cache-Control: private, no-store` 必須
    - `__tests__/route.test.ts` ユニットテスト
- [ ] **`src/features/slack-auth/api/supabase-jwt.ts` 新規作成**
    - `issueSupabaseJwt({ userId, slackTeamId, slackUserId })`
    - `jose` の `SignJWT` で HS256 署名
    - claims: `sub`, `role: 'authenticated'`, `slack_team_id`, `slack_user_id`, `aud: 'authenticated'`, `iss: 'tamamori'`, `iat`, `exp`, `jti`
    - **TTL 1 時間** (iron-session の 7 日とは独立)
- [ ] **`src/shared/lib/supabase/client.ts` factory 再設計** (論点 #1)
    - `@supabase/ssr` の `createBrowserClient` をやめ、素の `@supabase/supabase-js` の `createClient` に変更
    - `accessToken: async () => getSessionToken()` を渡す
    - `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }`
- [ ] **`src/shared/lib/supabase/token-cache.ts` 新規作成**
    - `getSessionToken()` — メモリキャッシュ + inflight 重複抑止 + 期限 60 秒バッファ
    - `clearSessionToken()` — ログアウト時に呼ぶ
    - `onTokenRefresh(callback)` — Realtime `setAuth` 同期用フック (論点 #3)
    - `__tests__/token-cache.test.ts` で並列 fetch・期限切れ判定・401 ハンドリングをテスト

### D. 既存コード追従

- [ ] `src/features/realtime-sync/model/use-bonsai-realtime.ts` — モジュールシングルトン撤去 + `slack_team_id` filter 併設
- [ ] `src/features/realtime-sync/model/use-all-bonsai.ts` — シグネチャに `slackTeamId` 追加 + `slack_team_id` filter
- [ ] `src/features/realtime-sync/model/use-realtime-auth-sync.ts` 新規 — `onTokenRefresh` で `realtime.setAuth` を同期
- [ ] `src/entities/bonsai/api/bonsai-api.ts` — `.eq('users.slack_team_id', ...)` → `.eq('slack_team_id', ...)` (論点 #6)
- [ ] `src/entities/bonsai/api/bonsai-swr.ts` — 同上 (表示用 `users!inner` JOIN は残す)
- [ ] `src/app/(pages)/garden/page.tsx` — 同上
- [ ] `src/app/(pages)/bonsai/[userId]/page.tsx` — 同上
- [ ] `src/entities/bonsai/api/bonsai-api.ts` — `createBonsai(userId, slackTeamId)` シグネチャ拡張
- [ ] `src/app/api/auth/slack/callback/route.ts` — `createBonsai(user.id, user.slack_team_id)` へ追従。**JWT 発行・cookie セットは削除** (callback では iron-session のみ)
- [ ] `src/app/api/auth/logout/route.ts` — `clearSessionToken()` 用ヘッダ等は不要 (クライアント側で破棄)。**iron-session destroy のみ**
- [ ] `src/entities/action/api/action-api.ts` — `insertAction` に `slack_team_id` 引数追加
- [ ] `src/features/bonsai-growth/api/process-event.ts` — `insertAction` 呼び出しに `user.slack_team_id` を渡す
- [ ] **クライアント側ログアウトハンドラ** (logout 完了後の処理) — `clearSessionToken()` + `supabase.removeAllChannels()`

### E. マイグレーション (論点 #4, #5)

- [ ] `supabase/migrations/007_denormalize_slack_team_id.sql`
    - users に複合 UNIQUE `(id, slack_team_id)` 追加
    - bonsai / action_log に `slack_team_id` 列追加 + backfill + NOT NULL + INDEX
    - bonsai / action_log の FK を複合 FK へ張り替え (`ON DELETE CASCADE ON UPDATE NO ACTION`)
    - **immutable トリガ** (users / bonsai / action_log の 3 テーブル) (論点 #4)
- [ ] `supabase/migrations/008_tenant_rls.sql`
    - 新ポリシー追加 (`authenticated` 向け `slack_team_id = (auth.jwt() ->> 'slack_team_id')`)
    - 旧 `anon_select_*` を DROP (新ポリシー追加後)
    - `users` / `bonsai` / `action_log` の SELECT ポリシーのみ
    - `growth_rules` は `USING (true)` で authenticated 全員可
    - **書き込み系ポリシーは追加しない** (service_role 経由のみ) ← 論点 #6 で確認

### F. ドキュメント

- [ ] `docs/data-model.md`
    - `bonsai` / `action_log` のカラム定義更新
    - `## RLS ポリシー` セクション新設
    - 複合 FK + immutable トリガの記述
    - ER 図に `slack_team_id` 列を反映
- [ ] `docs/architecture.md`
    - 認証フロー図に「`/api/auth/session-token` でブラウザが JWT を取得」ステップを追加
    - 「JWT を RLS が検証」「Realtime も JWT で認証」の流れを追記
- [ ] `docs/api-design.md`
    - `## 4. Supabase RLS` のテーブルを authenticated ベースに書き換え
    - `### マルチテナント認可` の「注意」節 (Realtime 抜け道) を #75 完了に更新
    - `/api/auth/session-token` 仕様を追加
- [ ] **`docs/adr/004-custom-jwt-for-rls.md`** 新規作成
    - 採用方針: カスタム JWT + サーバAPI 発行 + iron-session を Root of Trust
    - **JWT を使い捨てにする設計意図 (XSS 耐性・session/JWT の不整合排除) を Decision に明記**
    - 代替案棄却: callback で cookie 発行 / `setSession` 方式 / API Route 集約 / JOIN ベース RLS
    - 論点 #1〜#6 の決着を要約
    - 多層防御の役割分担表 (論点 #6)
    - 本番導入時 TODO (ロールアウト計画・SESSION_SECRET ローテ etc.) ← 論点 #5 末尾を転記

### G. テスト

- [ ] Jest ユニット
    - `issueSupabaseJwt` — HS256 署名、必須 claim、TTL、`jti` ユニーク性
    - `/api/auth/session-token` GET — 未認証 401 / 認証済み 200 + `Cache-Control` ヘッダ
    - `/api/auth/slack/callback` — **JWT 発行が削除されている**ことの逆テスト (回帰防止)
    - `/api/auth/logout` — iron-session が destroy される
    - `token-cache` — 並列 fetch の重複抑止 / 期限切れ再取得 / 401 時のキャッシュクリア
    - `createBrowserClient` factory — `accessToken` 関数オプションが渡される
    - `createBonsai(userId, slackTeamId)` — `slack_team_id` が INSERT される
    - `insertAction` — `slack_team_id` が INSERT される
    - `use-realtime-auth-sync` — `onTokenRefresh` 発火で `realtime.setAuth` が呼ばれる (モック検証)
- [ ] 手動 (ローカル Supabase)
    - 異なる team_id の JWT で `bonsai` SELECT → 空
    - 同一 team_id の JWT で `bonsai` SELECT → 成功
    - service_role → 全件取得できる (Server Component 経路の担保)
    - Realtime — 別テナントの UPDATE が届かない (filter + RLS 二重検証)
    - 複合 FK 違反の INSERT が DB で弾かれる
    - immutable トリガで `slack_team_id` UPDATE が拒否される
- [ ] Playwright E2E
    - 2 テナントで同時ログイン → 互いの盆栽が見えない (SSR / SWR / Realtime すべて)

### H. 運用 (本番導入時 TODO に格下げ — 論点 #5)

ステージング段階では以下は深追いしない:

- [ ] (本番時) デプロイ手順 (段階的 migration 適用 / SESSION_SECRET ローテ運用)
- [ ] (本番時) ロールバック手順 (`_revert.sql` 用意)
- [ ] (本番時) `SUPABASE_JWT_SECRET` ローテーション runbook (インシデント対応)
- [ ] (本番時) workspace 統合時の `slack_team_id` 変更手順 (immutable トリガ DISABLE → 一括 UPDATE → 再 ENABLE)

これらは ADR-004 末尾に「本番導入時 TODO」として列挙し、別 Issue で対応する。

## Issue 本文への反映方針

**推奨: 案 1 (Issue 本文を全面書き換え)**

- 当初の「callback で JWT 発行 + cookie 配布」前提のタスクが大幅に変わる
- サーバAPI 発行方式に基づくタスクで整理し直す
- 詳細は本ディレクトリ (`docs/review/75/issue/`) を参照する形にする

## 未解決の決定事項 (再掲)

| 論点 | 決定が必要な事項                                        | ブロッキング  |
| ---- | ------------------------------------------------------- | ------------- |
| #1   | `accessToken` オプション v2.101.1 で動作するか PoC      | **最優先**    |
| #2   | `/api/auth/session-token` のレスポンス形式 (上記で確定) | (実質決着)    |
| #3   | `realtime.setAuth` 呼び出し後の挙動 PoC                 | 実装開始前に  |
| #4   | 複合 FK + immutable トリガの 007 同梱 (上記で確定)      | (実質決着)    |
| #5   | ステージング migration 適用経路の確定                   | デプロイ前に  |
| #6   | JOIN 書き換えを #75 に同梱するか別 PR にするか          | PR 粒度の判断 |
