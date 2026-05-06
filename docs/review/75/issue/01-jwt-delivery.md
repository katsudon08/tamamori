# 論点 1: JWT のブラウザ配布経路

## 背景

Issue #75 は以下のように記載している:

> `src/shared/lib/supabase/client.ts`: factory を `createBrowserClient(jwt?)` に変更、内部で `setSession({ access_token: jwt, refresh_token: '' })` を呼ぶ

これが **実際に意図通り動くか** が実装時の最大の詰まりどころ。

## 現状

- `src/shared/lib/supabase/client.ts` は `@supabase/ssr` の `createBrowserClient` を使用 (cookie ベース)
- 既存 caller: `useBonsai` / `useAllBonsai` / `useBonsaiRealtime` / `useAllBonsaiRealtime`
- 後者 2 つは **モジュールスコープで `createBrowserClient()` を 1 回だけ呼び、シングルトン化している**
  (`src/features/realtime-sync/model/use-*.ts:11`)

## 選択肢

### 選択肢 A: `setSession({ access_token, refresh_token })`

Issue に記載の方式。

**懸念点:**

- `@supabase/supabase-js` v2 の `setSession` は **`refresh_token` が空文字でも JWT 検証自体は通る**ケースがあるが、内部で `refreshSession` を呼ぶタイミングが来ると空 refresh_token で失敗する。
- `onAuthStateChange` が `TOKEN_REFRESHED` イベントを発火しようとして例外になる可能性。
- `@supabase/ssr` の `createBrowserClient` は auth cookie を勝手に管理するため、`setSession` を明示的に呼ぶと cookie と不整合になる。

### 選択肢 B: 初期化時に `Authorization` ヘッダ固定

```ts
createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
});
```

- 素の `@supabase/supabase-js` の `createClient` を使用 (ssr 版でなく)
- `persistSession: false` で cookie 管理をオフ、JWT はアプリが管理
- **Realtime にも同じヘッダが適用される**

**懸念点:**

- JWT を差し替えるには client を再生成する必要がある (TTL 切れ時のハンドリング)
- `@supabase/ssr` の利点 (SSR 時の cookie 共有) を捨てることになるが、本プロジェクトでは SSR は service_role 経由なので問題ない

### 選択肢 C: `accessToken` オプション (新しめの API)

```ts
createClient(url, anonKey, {
    accessToken: async () => fetchJwtFromSessionTokenEndpoint(),
});
```

- supabase-js v2.45+ で追加された `accessToken` 関数オプション
- クライアントが RPC ごとに関数を呼んで最新 JWT を取得
- TTL 切れや rotation に自然対応できる

**懸念点 (PoC で解消済み):**

- ~~プロジェクトの supabase-js バージョン確認 (`^2.101.1` → 対応済みの想定だが要検証)~~ → **PoC で v2.101.1 動作確認済み** (`advice/poc-access-token-result.md`)
- ~~非同期関数なのでストリーミング RPC / Realtime の初期化タイミングに注意~~ → **PoC で判明**: Realtime は subscribe 前の **explicit `setAuth` が必須**。auto-setAuth は race する → 論点 #3 に集約

## 推奨スタンス

**選択肢 C (`accessToken` 関数オプション) を採用** (PoC 確認済み)。

理由:

- TTL 切れ時の再取得経路を一本化できる (REST 側は closure 差し替えで自動反映 — PoC で実証)
- session-token API 呼び出しを `accessToken` 関数内に閉じ込められる
- REST に対しては `accessToken` だけで十分。Realtime については別途 explicit setAuth が必要 (論点 #3)

## PoC で確認済みの事実 (2026-04-25)

- ✅ `accessToken` オプションは v2.101.1 で動作する
- ✅ REST: `accessToken` 経由の JWT で RLS の `auth.jwt()` が読める
- ✅ token 更新: closure 差し替えで次の RPC が新 JWT で実行される (内部キャッシュなし)
- ⚠️ Realtime: REST と異なり **explicit `setAuth` が必須** (論点 #3 で詳述)

## 決着後のタスク化

- `src/shared/lib/supabase/client.ts` の factory を `createClient` (素の `@supabase/supabase-js`) ベースに書き換え
- `accessToken: async () => getSessionToken()` を渡す
- `auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }` を併設
- `createBrowserClient` を呼んでいる全 caller の追従計画 (論点 #3 / #6 と連動)
