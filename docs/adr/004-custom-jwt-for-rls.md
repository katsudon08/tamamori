# ADR-004: RLS テナント分離のためのカスタム JWT 方式

## ステータス

承認済み (2026-04-25)

## コンテキスト

Issue #74 で「アプリ層でのマルチテナント認可 (`slack_team_id` ベース)」が完了し、Server Component / Entity API / SWR / process-event の全経路でテナント検証が通るようになった。ただし以下の弱点が残っている:

- **service_role キー経路 (Server Component / Entity API)**: RLS をバイパスするため、アプリ層のフィルタが唯一の防御。実装ミスで即座に越境
- **Realtime 購読 (`useAllBonsaiRealtime`)**: filter-less で全テナントの UPDATE がブラウザに届いている (#74 では未対応)
- **書き漏らしリスク**: 将来的に新規 fetcher を追加する際、`slack_team_id` フィルタを忘れる経路が増えうる

#75 のゴールは **DB 層 (RLS) を最終防衛線として導入すること**。ただし Supabase の標準認証 (Email + Password) は採用しておらず (Slack OAuth + iron-session で代替)、Supabase が想定する `auth.users` テーブル経由の自動 JWT 発行が使えない。**独自 JWT を Supabase JWT Secret で署名して流す**カスタム方式が必要となる。

本 ADR は以下の決定をまとめて記録する:

1. JWT の発行経路 (サーバAPI vs OAuth callback)
2. JWT のブラウザ側保持方式 (cookie vs メモリ)
3. supabase-js への注入方式 (`accessToken` vs `setSession` vs `Authorization` ヘッダ)
4. RLS ポリシーの参照形 (自テーブル列直接 vs JOIN/EXISTS)
5. WAL の `REPLICA IDENTITY` 設定
6. Realtime の auth 注入タイミング (auto-setAuth vs explicit setAuth)
7. スキーマ整合性 (アプリ層保証 vs 複合 FK)
8. JWT TTL とローテーション戦略

## 決定

### 1. JWT は OAuth callback ではなく `GET /api/auth/session-token` で都度発行する

callback で JWT を発行して httpOnly cookie に格納する案 (当初 Issue #75) を **棄却**。代わりに iron-session を Root of Trust とし、ブラウザがリクエストごとにサーバAPIから新鮮な JWT を取得する。

- **発行 API**: `GET /api/auth/session-token`
- **認証**: `tamamori_session` (iron-session) cookie のみを信頼
- **レスポンス**: `{ token, expiresAt }` (JSON)
- **TTL**: 1 時間 (3600 秒)。iron-session 側は 7 日

### 2. JWT を cookie に保存しない (メモリキャッシュのみ)

`sb-access-token` httpOnly cookie に JWT を載せる案を **棄却**。ブラウザは `getSessionToken()` のメモリキャッシュ (closure) でのみ保持する。

### 3. supabase-js には `accessToken` 関数オプションで注入する

`setSession({ access_token, refresh_token: '' })` 案・`global.headers.Authorization` 固定案を **棄却**。`accessToken: async () => getSessionToken()` を使う。

- `@supabase/ssr` の `createBrowserClient` ではなく素の `@supabase/supabase-js` の `createClient` を使う
- `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }`
- v2.101.1 で動作することを PoC で確認済み (`docs/review/75/issue/advice/poc-access-token-result.md`)

### 4. RLS ポリシーは「自テーブルの `slack_team_id` カラム直接参照」型に固定する

JOIN / EXISTS で `users.slack_team_id` を引く形を **棄却**。

```sql
-- 採用
CREATE POLICY "authenticated_select_bonsai" ON bonsai FOR SELECT TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

-- 棄却
CREATE POLICY "..." USING (
    EXISTS (SELECT 1 FROM users WHERE u.id = bonsai.user_id AND u.slack_team_id = ...)
);
```

### 5. `bonsai` / `action_log` を `REPLICA IDENTITY FULL` に設定する

```sql
ALTER TABLE bonsai REPLICA IDENTITY FULL;
ALTER TABLE action_log REPLICA IDENTITY FULL;
```

### 6. Realtime は subscribe 前に `await supabase.realtime.setAuth(jwt)` を必ず呼ぶ

`accessToken` 経由の auto-setAuth に依存しない。subscribe 前の explicit setAuth を**実装規約**として要件化する。

```ts
// 必須パターン
await supabase.realtime.setAuth(token);
const channel = supabase.channel(...).on('postgres_changes', ...).subscribe();
```

JWT 更新時 (TTL ロールオーバー) は `realtime.setAuth(newToken)` を再度呼ぶ。テナント切替・ログアウト時は `removeAllChannels()` + client 再生成。

### 7. スキーマ整合性は複合 FK + immutable トリガで保証する

- `users (id, slack_team_id)` に複合 UNIQUE
- `bonsai (user_id, slack_team_id) → users (id, slack_team_id)` 複合 FK (`ON DELETE CASCADE ON UPDATE NO ACTION`)
- `action_log` も同様
- `users` / `bonsai` / `action_log` の `slack_team_id` に immutable BEFORE UPDATE トリガ

### 8. #74 のアプリ層 `slack_team_id` フィルタは削除しない

RLS と並走させる多層防御。Server Component / Entity API は service_role 経由なので RLS バイパス → アプリ層が唯一の防御。SWR / Realtime は冗長だが対称性のため残す。

## 理由

### 1. なぜ callback での JWT 発行ではなくサーバAPI で都度発行するのか

| 観点                       | callback で cookie 配布                        | **サーバAPI で都度発行 (採用)**                     |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| 信頼源 (Root of Trust)     | iron-session **と** JWT cookie の 2 系統       | **iron-session 一系統**                             |
| TTL 切れ時の挙動           | 強制再ログイン (cookie 切れたら復元できない)  | **iron-session が生きていればシームレスに新 JWT**   |
| logout の整合性            | 両 cookie を破棄する必要 (片方残ると不整合)    | iron-session 破棄だけで JWT も次の取得時に 401      |
| インシデント時の失効       | cookie を全ユーザーから消す手段が無い          | `SUPABASE_JWT_SECRET` ローテで全 JWT 一斉失効可能   |
| 当初案の矛盾               | httpOnly と `document.cookie` 読みは両立しない | 矛盾なし                                            |

決め手は **「信頼源を増やさない」**。iron-session に集約することで、認証/認可の状態が常に 1 箇所で決まり、JWT は派生物にすぎない。

### 2. なぜ JWT を cookie に保存しないのか (XSS 耐性の設計意図)

- **`localStorage` 禁止は標準だが、cookie に置くだけでも盗難価値が残る**:
    - httpOnly cookie であっても、XSS で JS が動けば `fetch('/api/auth/session-token')` を叩いて取れる
    - cookie が永続化されている分、攻撃者は「JWT を窃取して持ち出す」モチベーションが上がる
- **JWT を「使い捨て」化することで盗難価値を下げる**:
    - メモリキャッシュ + TTL 1 時間 → 盗まれても短時間しか有効でない
    - cookie に永続化しないので「ブラウザを閉じれば消える」性質を維持
    - revoke 不可だが `SUPABASE_JWT_SECRET` ローテで一斉失効可能 (インシデント対応)
- **真の XSS 対策 (CSP・入力サニタイズ) は別途必要**だが、JWT を使い捨てにする設計はそれを補完する

### 3. なぜ `accessToken` 関数オプションなのか

PoC で 3 案を比較した:

| 案                                  | 評価                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **A. `accessToken` 関数オプション (採用)** | リクエストごとに関数を呼ぶ → TTL 切れ・rotation に自然対応。client 再生成不要。closure 内で responsibilities が完結 |
| B. `setSession({ access_token, refresh_token: '' })` | 内部で `refreshSession` が走ると空 refresh_token で失敗。`@supabase/ssr` の cookie 管理と衝突 |
| C. `global.headers.Authorization` 固定 | TTL 切れで client 再生成が必要 → caller 側に複雑度が漏れる                                              |

PoC 結果 (`accessToken called 3 times: [A, A, B]`):

- closure 内で値を差し替えれば次の RPC で新 JWT が使われる (内部キャッシュなし)
- supabase-js v2.101.1 で動作する

### 4. なぜ RLS ポリシーは自テーブル列直接参照なのか (PoC 由来)

**PoC で JOIN/EXISTS ベースのポリシーが postgres_changes で機能しないことを実証**:

- REST (PostgREST 経由) では JOIN/EXISTS ポリシーは機能する
- しかし Realtime postgres_changes の RLS 評価は **WAL 行に含まれるカラムだけ**で行われる
    - 他テーブル (`users`) への subquery を解決できない
    - JOIN 経由で `users.slack_team_id` を引くポリシーだと、行が無条件で漏れる
- PoC で実証: JOIN ポリシーで team B の UPDATE が team A の購読に届いた

`bonsai.slack_team_id` を denormalize して直接参照する形にすれば、REST/Realtime 両方で同じセマンティクスで動く。

### 5. なぜ `REPLICA IDENTITY FULL` が必要なのか (PoC 由来)

PostgreSQL の WAL は **`REPLICA IDENTITY DEFAULT` (デフォルト) では PK と変更カラムしか出力しない**。

- 例: `UPDATE bonsai SET total_messages = ... WHERE id = ...` の場合、WAL には `id`, `total_messages` のみ
- RLS が `slack_team_id = auth.jwt() ...` を評価しようとしても、**`slack_team_id` が WAL に含まれない → ポリシー評価不能 → 行が落ちる**
- PoC で実証: `relreplident = 'd'` のままだと自テナントの UPDATE すら届かない / `'f'` (FULL) に変更したら正しく届く

`bonsai` / `action_log` の更新頻度は小さいので WAL 容量増加は無視できる範囲。

### 6. なぜ explicit `setAuth` が必須なのか (PoC 由来)

supabase-js のコンストラクタは `accessToken` オプション設定時、**fire-and-forget の Promise** で `realtime.setAuth(token)` を呼ぶ:

```ts
// SupabaseClient.ts:333-338
if (this.accessToken) {
    Promise.resolve(this.accessToken())
        .then((token) => this.realtime.setAuth(token))   // 非同期・await されない
        .catch(...);
}
```

ユーザーコードが直後に `channel().subscribe()` を呼ぶと、setAuth 完了前に subscribe が走る → WebSocket は anon ロールで postgres_changes RLS を評価する → `anon_select_*` ポリシーが該当して全行が漏れる。

PoC で実証 (`POC_NO_EXPLICIT_SETAUTH=1`):

- explicit setAuth 無し → team B の UPDATE が team A の購読に漏れる
- explicit `await supabase.realtime.setAuth(jwt)` あり → 正しく filter される

→ **実装規約として subscribe 前の explicit setAuth を必須化**する。

### 7. なぜ複合 FK + immutable トリガなのか

denormalize したため、**`bonsai.slack_team_id` と `users.slack_team_id` の整合性が崩れるリスク**が生まれる。RLS は `bonsai.slack_team_id` を信頼するため、ここがズレるとそのまま越境を許す。

| 案                              | 評価                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| アプリ層保証のみ                | コピペバグ・将来のリグレッションに弱い。RLS の「最終防衛線」価値が半減                      |
| **複合 FK + immutable (採用)** | DB 側で物理的に保証 → アプリ層バグが越境につながる経路を遮断 (#75 の本来の目的と一致)        |
| トリガで都度 SELECT             | サブクエリ CHECK 制約は PostgreSQL で不可。トリガ代替は性能オーバーヘッドが高い              |

immutable トリガの対象は 3 テーブル (`users` / `bonsai` / `action_log`):

- `bonsai.slack_team_id` を UPDATE で書き換えると認可の根拠が後から変わる
- `users.slack_team_id` を変更すると複合 FK で子テーブルを巻き込む。ad-hoc migration で対応する運用にすれば immutable で問題ない

### 8. なぜ #74 のアプリ層フィルタを削除しないのか

| 経路                       | アクセスキー        | RLS が効くか    | 防御主体                |
| -------------------------- | ------------------- | --------------- | ----------------------- |
| Server Component (`/garden`) | service_role        | **バイパス**    | **アプリ層 (唯一)**    |
| Entity API (callback 等)    | service_role        | **バイパス**    | **アプリ層 (唯一)**    |
| ブラウザ SWR                | anon + 独自 JWT     | 効く            | RLS + アプリ層 (二重) |
| ブラウザ Realtime           | anon + 独自 JWT     | 効く            | RLS + filter (二重)   |

- **service_role 経路ではアプリ層が唯一の防御**。削除すると即座に越境
- SWR / Realtime は RLS と冗長だが、防御の対称性 + 将来の RLS バグ時の保険
- 加えて FSD の Public API として「テナント ID が必須」を型レベルで表現する効果

### 9. なぜ JWT TTL = 1 時間なのか

- **短すぎる場合**: 発行頻度が上がる・Realtime 接続継続のための setAuth 頻度が増える
- **長すぎる場合**: logout 後に有効期間が残る窓が広がる (revoke できないため)
- 1 時間は **「セッション盗難の被害を限定しつつ、頻繁な再取得を避ける」バランス点**
- iron-session 7 日 TTL とは独立。iron-session が生きている限り JWT は自動ロールオーバー

## 検討した選択肢 (棄却したもの)

### A. Supabase 標準認証 (Email + Password) への切替

- iron-session + Slack OAuth から Supabase Auth への乗り換えはコスト大
- Slack に紐付いたユーザー管理を `auth.users` に二重化することになり整合性管理が増える
- **棄却**

### B. API Route 集約方式 (RLS を使わずアプリ層で全認可)

- ブラウザから Supabase に直接アクセスせず、すべて Next.js API Route 経由にする案
- メリット: RLS 不要・JWT 不要
- デメリット: Realtime が API Route 経由で実装困難 (WebSocket プロキシが必要)
- **棄却**: 既存の Supabase Realtime 統合を捨てる代償が大きい

### C. JOIN ベース RLS (`bonsai.user_id → users.slack_team_id`)

- denormalize 不要・スキーマ簡素
- **棄却**: PoC で postgres_changes の RLS が JOIN/EXISTS を評価できないことを確認

### D. `setSession` で JWT 注入

- Issue #75 当初案
- **棄却**: `@supabase/ssr` の cookie 管理と衝突 / 空 refresh_token で `refreshSession` が失敗する経路あり

### E. callback で JWT を httpOnly cookie に発行

- Issue #75 当初案
- **棄却**: 信頼源が iron-session と JWT cookie の 2 系統に分裂 / 当初案自体に「httpOnly + `document.cookie` 読み」の矛盾があった / TTL 切れ時に再ログインが必要

## PoC で検証済みの事実

`docs/review/75/issue/advice/poc-access-token-result.md` 参照。

- ✅ supabase-js v2.101.1 で `accessToken` オプションが動作
- ✅ REST: `accessToken` 経由の JWT で RLS の `auth.jwt()` が読める
- ✅ Realtime: explicit `setAuth` ありで RLS が postgres_changes に正しく適用される
- ✅ token 更新: `accessToken` closure 差し替えで次の REST が新 JWT で実行される
- ❌ Realtime: explicit `setAuth` 無し (auto-setAuth のみ) では他テナント UPDATE が漏れる
- ❌ JOIN/EXISTS RLS: postgres_changes で機能せず他テナント UPDATE が漏れる
- ❌ `REPLICA IDENTITY DEFAULT`: 自テナントの UPDATE すら届かない (RLS 評価不能)

## 多層防御の役割分担

| 層                          | 経路                                          | 防御主体                  | 補足                                |
| --------------------------- | --------------------------------------------- | ------------------------- | ----------------------------------- |
| Server Component / SSR     | `service_role` キー                           | **アプリ層 (唯一)**       | RLS バイパス                        |
| Entity API (server-side)    | `service_role` キー                           | **アプリ層 (唯一)**       | RLS バイパス                        |
| ブラウザ SWR fetch          | `anon` キー + 独自 JWT                        | RLS + アプリ層 (二重)    | アプリ層は冗長だが対称性のため維持 |
| ブラウザ Realtime 購読      | `anon` キー + 独自 JWT + explicit `setAuth`   | RLS + 購読 filter (二重) | filter で先絞りして RLS 適用漏れに保険 |
| 書き込み (INSERT/UPDATE)    | `service_role` キー                           | **アプリ層 (唯一)**       | JWT コンテキストなし                |

## 影響

### コード変更

- `package.json` に `jose` 追加
- `src/shared/lib/supabase/client.ts` を `@supabase/ssr` から `@supabase/supabase-js` に書き換え
- `src/shared/lib/supabase/token-cache.ts` 新規 (メモリキャッシュ + inflight 抑止 + `onTokenRefresh`)
- `src/app/api/auth/session-token/route.ts` 新規
- `src/features/slack-auth/api/supabase-jwt.ts` 新規 (`jose` で HS256 署名)
- Realtime hook (`use-bonsai-realtime.ts` / `use-all-bonsai.ts`) のシングルトン撤去 + explicit setAuth + filter 二重化
- `useRealtimeAuthSync` 新規 (`onTokenRefresh` → `realtime.setAuth` 同期)
- callback / logout から JWT cookie 関連処理を削除
- SWR / SSR / Entity API の `users.slack_team_id` JOIN を `bonsai.slack_team_id` 直接参照に書き換え
- `createBonsai` / `insertAction` のシグネチャに `slackTeamId` 追加

### スキーマ変更 (007 / 008 migration)

- `users` 複合 UNIQUE / `bonsai` `action_log` の denormalize 列追加・複合 FK・REPLICA IDENTITY FULL
- 3 テーブルに immutable BEFORE UPDATE トリガ
- 旧 `anon_select_*` ポリシー DROP / 新 `authenticated_select_*` 追加 (自テーブル列直接参照)
- `growth_rules` のみ `USING (true)` で authenticated 全員可

### 運用 (本番導入時 TODO)

ステージング前提のため、以下は本番リリース前に別 Issue で対応する:

- 段階的デプロイ計画 (007 適用 → アプリデプロイ → 008 適用)
- ロールバック SQL の事前用意
- `SESSION_SECRET` ローテーション運用
- `SUPABASE_JWT_SECRET` ローテーション runbook (インシデント対応)
- workspace 統合時の `slack_team_id` 変更手順 (immutable トリガ DISABLE → 一括 UPDATE → 再 ENABLE)
- monitoring (RLS で 0 行になったクエリ件数のメトリクス取得)

## 再検討の条件

以下の状況が発生した場合、本 ADR を再検討する:

- **Supabase が公式に「Custom JWT for Realtime」を非推奨化した場合** → Realtime Authorization (private channels) への移行を検討
- **`accessToken` オプションが破壊的に変更された場合** → `Authorization` ヘッダ固定方式 (再生成あり) にフォールバック
- **postgres_changes が JOIN/EXISTS ポリシーをサポートするように変更された場合** → denormalize の必要性を再評価 (ただし複合 FK の整合性保証は依然として有用)
- **テナントを跨いだ機能要件が発生した場合** (例: 管理者 dashboard) → service_role 経由のアプリ層認可で対応するか、別 JWT スコープの導入を検討

## 参考文献

- 詳細レビュー: `docs/review/75/issue/00-overview.md` 配下の論点 #1〜#7
- PoC 結果: `docs/review/75/issue/advice/poc-access-token-result.md`
- 実装仕様: `docs/review/75/issue/advice/jwt-server-issuance-spec.md`
- Supabase RLS with Custom JWT: https://supabase.com/docs/guides/auth/jwts
- supabase-js v2.101.1 ソース (`accessToken` 実装): `node_modules/@supabase/supabase-js/src/SupabaseClient.ts:307-340, 533-541`
