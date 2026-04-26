# JWT サーバAPI発行方式 — 詳細仕様

## 背景

Issue #75 の JWT 配布について、当初案では「OAuth callback で JWT を発行し httpOnly cookie `sb-access-token` に格納 → クライアントが `/api/auth/session-token` で読み出す」だったが、方針を見直し **「JWT は cookie に載せず、サーバAPI が iron-session から都度ミントする」** 方式を採用する。

本書は論点 #1 (JWT 配布経路) / #2 (session-token エンドポイント) / #3 (Realtime 認証) の結論を踏まえて、採用方針の詳細を具体化したもの。ADR-004 のドラフト材料として使用する。

## 前提

- **iron-session cookie (`tamamori_session`) を Root of Trust とする**。JWT は常にこの cookie 配下の session から派生する副産物であり、session が無効なら JWT は発行されない。
- `@supabase/ssr` ではなく素の `@supabase/supabase-js` を使う (cookie 管理を iron-session と衝突させない)。
- Supabase JWT Secret (`SUPABASE_JWT_SECRET`) で HS256 署名した独自 JWT を `authenticated` ロールとして流す。

---

## 1. JWT 発行 API の仕様

**パス**: `GET /api/auth/session-token`

- メソッドは GET。副作用なし・冪等 (同一 session から同一 claims の JWT を毎回ミント、ただし `iat`/`exp`/`jti` だけが変わる)。
- CSRF 懸念があるなら POST にする選択肢もあるが、**JWT を body で返すだけで state 変更がない**ため GET で十分 (CSRF は状態変更を伴うエンドポイントでのみ問題)。

**認証方法**: `tamamori_session` (iron-session) cookie を Root of Trust として信頼。

- `getSession()` で iron-session を読み、`isAuthenticated(session)` が true であることを確認。
- `slack_team_id` / `user_id` は **session からのみ** 取得。リクエスト body・query には一切依存しない (ここを破ると IDOR に戻る)。
- 別系統の `Authorization` ヘッダや API key は不要。

**レスポンス形式**:

```json
// 200 OK
{
    "token": "eyJ...",
    "expiresAt": 1745308800 // Unix epoch (seconds)
}
```

- `expiresAt` を返すのは **クライアント側で期限切れ直前に prefetch できるようにするため**。JWT を decode させないため。
- `Cache-Control: private, no-store` を必ず付与 (中間キャッシュ・ブラウザキャッシュで他テナントに漏れないように)。
- `X-Content-Type-Options: nosniff`, `Vary: Cookie` も付与。

**エラーハンドリング**:

| 条件                                            | ステータス | body                                             |
| ----------------------------------------------- | ---------- | ------------------------------------------------ |
| session cookie なし / `isAuthenticated` false   | 401        | `{ "token": null, "reason": "unauthenticated" }` |
| session 不正 (改ざん等) → iron-session が throw | 401        | 同上 (catch して一律 401)                        |
| `SUPABASE_JWT_SECRET` 未設定等サーバ不備        | 500        | `{ "token": null, "reason": "server_error" }`    |

- 401 は **リダイレクトしない** (API なので JSON を返す)。フロント側の fetch 層で 401 を検知して `/` に誘導する。

---

## 2. JWT の中身 (claims)

```jsonc
{
    "sub": "<users.id (UUID)>", // Supabase が参照する標準クレーム
    "role": "authenticated", // RLS の TO authenticated に合致させる
    "slack_team_id": "<Txxxxxx>", // RLS 本丸。auth.jwt() ->> 'slack_team_id' で参照
    "slack_user_id": "<Uxxxxxx>", // 監査ログ用 (任意)
    "aud": "authenticated", // Supabase 既定
    "iss": "tamamori", // 自前発行の識別
    "iat": 1745305200,
    "exp": 1745308800, // iat + 3600
    "jti": "<random uuid>", // 監査・失効トラッキング用
}
```

**必須フィールド**:

- `sub`, `role`, `aud`: Supabase 側で PostgREST/Realtime が期待する標準クレーム。
- `slack_team_id`: RLS ポリシーが参照する唯一のテナントキー (**ここが全防衛線の要**)。
- `exp`, `iat`: 期限管理。

**RLS で使用するキー名**: `slack_team_id` (スネークケース)。

- マイグレーション `008_*.sql` の RLS 側は `(auth.jwt() ->> 'slack_team_id')` で参照。
- `user_id` 条件が必要なポリシーでは `(auth.jwt() ->> 'sub')::uuid = bonsai.user_id` で照合。

**TTL**: **1時間 (3600秒)** を推奨。

- 短すぎると発行頻度が上がる・Realtime 再接続が頻発する。
- 長すぎると logout 後も残る窓が広がる。
- iron-session 側の 7 日 TTL とは独立 (JWT は常に短命で iron-session 下で都度ミント)。

**署名方式**: HS256 + `SUPABASE_JWT_SECRET` (Supabase ダッシュボード記載の secret)。

- これは ADR-004 の前提通り。非対称 (RS256) は不要。

---

## 3. JWT の取得タイミング・token-cache の責務

**初回取得**: **lazy** (ページロード時の blocking な SSR fetch は入れない)。

- 具体的には、Supabase client の `accessToken` 関数オプション内で「まだ token を持っていなければ fetch」という形にする (下記 4)。
- ページロード直後の SSR fallback 描画 (SWR の initial data) は `service_role` 経由で既に済んでいる → JWT が無くても初期描画はブロックされない。
- JWT が初めて必要になるのは **クライアント側の Realtime 購読開始時 or SWR の revalidation** のタイミング。

### token-cache モジュール (`src/shared/lib/supabase/token-cache.ts`) の責務範囲

token-cache は以下を**集中して担う**。caller (Supabase client / Realtime hook) はこれらの詳細を知らなくてよい。

| 責務                     | 説明                                                                                                | 実装メモ                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **メモリキャッシュ保持** | `{ token, expiresAt }` を closure 内に保持                                                          | `localStorage` / `sessionStorage` 禁止 (XSS 耐性)                         |
| **期限判定**             | `expiresAt - now > 60` ならキャッシュヒット、それ以外は再 fetch                                     | 60 秒バッファで TTL 切れ直前のレースを抑止                                |
| **並列 fetch 重複抑止**  | 同時に複数 caller が `getSessionToken()` を呼んでも、進行中の fetch は **1 本に集約**               | `inflight: Promise<string> \| null` パターン                              |
| **先行更新 (proactive)** | TTL 残り 60 秒以下になったら次の `getSessionToken()` 呼び出しで透過的に再取得                       | 別途 setTimeout でのバックグラウンド更新は**しない** (実装複雑化を避ける) |
| **401 ハンドリング**     | `/api/auth/session-token` が 401 を返したらキャッシュをクリアし `Error('session_expired')` を throw | caller (fetcher wrapper) が catch して `/` リダイレクト                   |
| **明示破棄**             | `clearSessionToken()` を export → ログアウト・テナント切替時に呼ばれる                              | Realtime の `removeAllChannels()` と並べて呼ぶ                            |
| **Realtime 同期フック**  | `onTokenRefresh(callback)` を export → token 再取得成功時に callback を呼ぶ                         | Realtime hook 側で `setAuth(newToken)` をフックさせる (論点 #3)           |

**やらないこと (明示):**

- 自前 setTimeout / setInterval でのバックグラウンド prefetch (タイマー管理が複雑、効果限定的)
- `sessionStorage` / `localStorage` への永続化 (XSS 耐性放棄)
- Supabase client の状態管理 (それは supabase-js に任せる)

### 実装雛形

```ts
// src/shared/lib/supabase/token-cache.ts
type Cached = { token: string; expiresAt: number };
type RefreshCallback = (newToken: string) => void;

let cached: Cached | null = null;
let inflight: Promise<string> | null = null;
const refreshCallbacks = new Set<RefreshCallback>();

const BUFFER_SECONDS = 60;

export async function getSessionToken(): Promise<string> {
    const now = Date.now() / 1000;
    if (cached && cached.expiresAt - now > BUFFER_SECONDS) return cached.token;
    if (inflight) return inflight;

    inflight = fetch('/api/auth/session-token', { credentials: 'same-origin' })
        .then(async (r) => {
            if (r.status === 401) {
                cached = null;
                throw new Error('session_expired');
            }
            if (!r.ok) throw new Error(`session_token_fetch_failed:${r.status}`);
            const { token, expiresAt } = (await r.json()) as Cached;
            cached = { token, expiresAt };
            refreshCallbacks.forEach((cb) => cb(token));
            return token;
        })
        .finally(() => {
            inflight = null;
        });

    return inflight;
}

export function clearSessionToken(): void {
    cached = null;
}

export function onTokenRefresh(cb: RefreshCallback): () => void {
    refreshCallbacks.add(cb);
    return () => {
        refreshCallbacks.delete(cb);
    };
}
```

---

## 4. Supabase client への適用方法

**採用**: **`accessToken` 関数オプション** (論点 #1 の選択肢 C)。

```ts
// src/shared/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { getSessionToken } from './token-cache';

export function createBrowserClient() {
    return createClient(getEnv().NEXT_PUBLIC_SUPABASE_URL, getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        accessToken: async () => getSessionToken(),
        auth: {
            persistSession: false, // cookie 管理を切る (iron-session と衝突させない)
            autoRefreshToken: false, // 自前で token-cache が管理
            detectSessionInUrl: false,
        },
    });
}
```

- **`@supabase/ssr` の `createBrowserClient` ではなく素の `createClient` を使う** (ssr 版は Supabase 自身の cookie を触るため、iron-session + 自前 JWT 方式と衝突する)。
- **client の再生成は不要**。`accessToken` がリクエストごとに呼ばれるため、token が入れ替わっても差し替えは自動。
- `Authorization` ヘッダ固定方式は採らない (TTL 切れで手動再生成が必要になるため敗北)。

**現状コードの影響**:

- `use-bonsai-realtime.ts` / `use-all-bonsai.ts` の **モジュールスコープの `createBrowserClient()` シングルトンを撤去**し、フック内で生成 or Provider で渡す (論点 #3 参照)。
- SWR fetcher も同じ client を使うので、`entities/bonsai/api/bonsai-swr.ts` 側は変更最小。

**要検証**: `@supabase/supabase-js` v2.101.1 が `accessToken` オプションに対応していること。未対応なら **選択肢 B (`global.headers.Authorization` + 再生成) にフォールバック**。この PoC は実装着手の最初に行う。

---

## 5. Realtime との統合

Realtime は WebSocket を張りっぱなしにするため、REST と挙動が異なる。

### 接続時の JWT

- `accessToken` 関数オプション採用時、Realtime は **初回接続時に関数を呼んで JWT を付与**する (supabase-js が内部で `setAuth` 相当を実行)。
- したがって通常ケースでは **アプリ側で `setAuth` を明示呼び出しする必要はない**。

### JWT 更新時の正式パターン

接続中に JWT が切り替わるケースの**正式パターンを以下の 2 つに固定**する:

| ケース                                 | 採用パターン                              | 理由                                                                             |
| -------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| **TTL ロールオーバー**                 | **`realtime.setAuth(newToken)`**          | 既存チャネルを維持したまま auth だけ更新。再購読のオーバーヘッド・体験影響なし。 |
| **テナント切替 (logout → 別ログイン)** | **client 再生成 + `removeAllChannels()`** | 認可境界が変わる場面で接続を維持するのは危険。明示的に全断 → 再構築。            |

**実装方針**:

- TTL ロールオーバー: token-cache の `onTokenRefresh` フックを使う

```ts
// src/features/realtime-sync/model/use-realtime-auth-sync.ts
import { onTokenRefresh } from '@/shared/lib/supabase/token-cache';

export function useRealtimeAuthSync(supabase: SupabaseClient) {
    useEffect(() => {
        return onTokenRefresh((newToken) => {
            supabase.realtime.setAuth(newToken);
        });
    }, [supabase]);
}
```

- テナント切替: ログアウトハンドラから呼ぶ

```ts
// logout 完了後
clearSessionToken();
supabase.removeAllChannels();
// 次のページ遷移で client が新規作成される
```

### 購読側 filter 二重化 (論点 #3 のとおり)

- `useAllBonsaiRealtime` に `slackTeamId` 引数を追加し、`filter: 'slack_team_id=eq.${slackTeamId}'` を付与。
- RLS が仮にバグっても購読段階で弾く多層防御。

---

## 6. セキュリティ前提

### session → JWT 発行の信頼関係

- **iron-session cookie を Root of Trust とする**。JWT は常にその派生物であり、session が無効なら JWT は発行しない。
- `SESSION_SECRET` と `SUPABASE_JWT_SECRET` は別物・どちらも環境変数で secrets として管理 (git に入れない)。
- session 偽造耐性は iron-session の AEAD 暗号化に依存 (既存設計のまま)。

### JWT 改ざん耐性

- HS256 署名 + `SUPABASE_JWT_SECRET`。secret は Supabase のみが検証用に保持、アプリサーバは発行用に保持。クライアントには絶対に露出しない。
- `iss: 'tamamori'`, `aud: 'authenticated'` を検証することで他システムの JWT を誤受容しない (Supabase 側は `aud` のみ見るが、監査上 `iss` は重要)。

### XSS

- **設計意図 (ADR-004 に明記すべき): JWT を「使い捨て」にすることで XSS 時の盗難価値を低下させる**:
    - JWT は **メモリキャッシュのみ**・`localStorage` 禁止
    - TTL 1 時間で自然に期限切れ → 盗まれても短時間しか有効でない
    - revoke 不可だがインシデント時は `SUPABASE_JWT_SECRET` ローテで一斉失効可能
    - cookie に載せないことで「ブラウザに永続的に残る credentials」を持たない
- `/api/auth/session-token` のレスポンスは `Cache-Control: private, no-store`
- iron-session cookie は `HttpOnly` + `Secure` + `SameSite=Lax` (既存)
- 真の XSS 対策 (CSP・入力サニタイズ) は本 Issue のスコープ外だが、JWT を使い捨てにする設計はそれを補完する

### CSRF

- `GET /api/auth/session-token` は state 変更なし → CSRF で呼ばれても「攻撃者は JWT を読み出せない」(same-origin レスポンス) → 実害なし。
- `SameSite=Lax` により cross-site からの fetch には cookie が付かないため、実質的に CSRF 経路は閉じている。
- 万一に備え、レスポンスに `X-Content-Type-Options: nosniff` を付与。

### Supabase 側

- PostgREST の `GUC_JWT_SECRET` = `SUPABASE_JWT_SECRET` (Supabase が最初からそう設定している)。独自 JWT は自動で `auth.jwt()` から参照可能。
- `anon` キーはフロントに出る前提のまま。RLS で authenticated/anon を分けるポリシーを 008 マイグレーションで厳格に書く。

---

## 7. 失効・ローテーション戦略

### TTL 切れ時の挙動

1. クライアントの `accessToken` 関数が呼ばれた瞬間、キャッシュ残り 60 秒以下なら **自動 fetch**。
2. fetch 中はその 1 呼び出しだけが inflight Promise を待つ。
3. fetch 成功 → `onTokenRefresh` callback 経由で Realtime に `setAuth` を走らせる (上記 5)。
4. fetch が 401 を返した (session cookie も切れた) → token-cache クリア → fetcher wrapper で `/` へ誘導。

### ログアウト時の扱い

- `/api/auth/logout` で **iron-session を destroy** (既存)。
- JWT は stateless なので **revoke できない** → TTL が切れるまで理論上有効。
- 対策: **ログアウト直後にクライアント側で `clearSessionToken()` + `supabase.removeAllChannels()`** を実行し、以後 `accessToken` コールバックが呼ばれたら 401 → 自然に死ぬ。
- サーバ側で能動的に失効したい場合 (インシデント対応) は **`SUPABASE_JWT_SECRET` ローテーション**で全 JWT 一斉失効 (運用手順は本番導入時 TODO として ADR-004 に記載)。

### session 破棄との整合性

- session が切れた状態で `/api/auth/session-token` を叩けば 401 を返す → クライアント側では token fetch 失敗 → `clearSessionToken` + リダイレクト。
- session TTL 7 日 vs JWT TTL 1 時間の非対称はこの方式の前提利点: **iron-session が生きている間はシームレスに JWT を更新し続けられる**。

### ローテーション運用 (本番導入時の TODO)

- `SUPABASE_JWT_SECRET` を Supabase ダッシュボードで更新 → Vercel の env var を同時に更新 → 既存 JWT は即失効 → 全クライアントが次の `accessToken` コールで新鮮な JWT を自動取得。
- 通常運用では rotation 不要。インシデント時のみ。
- 詳細 runbook はステージング段階では不要。本番リリース前に別 Issue で起票。

---

## ADR-004 へ反映する骨子

上記を `docs/adr/004-custom-jwt-for-rls.md` に落とし込む際の見出し案:

1. **Context** (#74 完了・#75 ゴール・iron-session の設計思想)
2. **Decision**
    - 発行経路: `GET /api/auth/session-token` (iron-session を Root of Trust)
    - Claims 構造 (表)
    - 取得戦略: `accessToken` 関数オプション + メモリキャッシュ (token-cache の責務範囲)
    - **Realtime + RLS を成立させる必須条件 (PoC 由来)**:
        - **subscribe 前の explicit `await supabase.realtime.setAuth(jwt)`** (auto-setAuth に依存しない)
        - **RLS ポリシーは自テーブルの `slack_team_id` 直接参照** (JOIN/EXISTS は postgres_changes で機能しない)
        - **`bonsai` / `action_log` を `REPLICA IDENTITY FULL`** に設定 (WAL に必要なカラムを載せる)
    - JWT 更新パターン:
        - TTL ロールオーバー → `realtime.setAuth(newJwt)`
        - テナント切替/ログアウト → `removeAllChannels()` + client 再生成
    - **「JWT を使い捨てにする」設計意図** (XSS 耐性・session/JWT 不整合排除・cookie に永続化しない理由)
3. **多層防御の役割分担表** (論点 #6 の表を転記)
4. **Consequences** (受容するトレードオフ・操作要件)
5. **Alternatives considered** (callback で cookie 配布 / `setSession` / Authorization ヘッダ固定 / API Route 集約 / JOIN ベース RLS)
6. **検証済みの前提** (`docs/review/75/issue/advice/poc-access-token-result.md` の PoC 結果へリンク)
7. **本番導入時 TODO** (論点 #5 末尾を転記)

## 次のアクション候補

- ADR-004 のドラフト起こし
- `/api/auth/session-token` の TDD 雛形 (Red テスト先) を書く
- token-cache の TDD 雛形を書く
- 実装着手 (Issue #75 タスクリストの再構築 → コーディング)
