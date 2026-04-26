# 論点 2: `/api/auth/session-token` エンドポイント仕様

## 背景

Issue #75 当初案では「OAuth callback で JWT を発行し httpOnly cookie `sb-access-token` に格納 → ブラウザは cookie or `/api/auth/session-token` で読み出す」方式だった。

本レビューで方針を変更:

- **JWT は cookie に載せない** (httpOnly でも localStorage でも持たない)
- **callback では JWT を発行しない** (iron-session のみセット)
- **`/api/auth/session-token` がリクエストごとに iron-session を読んで JWT をミントして返す**

これにより、cookie 経由の JWT 配布議論 (httpOnly vs document.cookie の矛盾) は不要となり、エンドポイント仕様を詰めることに集中できる。

## エンドポイント仕様

### パス・メソッド

```
GET /api/auth/session-token
```

- **GET** を採用。理由:
    - 副作用なし (JWT を返すだけで状態を変更しない)
    - キャッシュは `Cache-Control: private, no-store` で抑止
    - CSRF 上の懸念は **同一オリジンレスポンスで JWT を読み出すだけ**なので外部攻撃者が読める経路がない (`SameSite=Lax` cookie 前提)

### 認証

- **`tamamori_session` (iron-session) cookie を Root of Trust** とする
- `getSession()` で読み、`isAuthenticated(session)` が true であることを確認
- **`slack_team_id` / `userId` は session からのみ取得**。リクエスト body / query には依存しない (依存するとそこから IDOR が発生)
- 別系統の認証ヘッダ・API key は不要

### レスポンス形式

#### 200 OK

```json
{
    "token": "eyJ...<HS256 JWT>",
    "expiresAt": 1745308800
}
```

- `expiresAt` は Unix epoch (秒)。クライアントが期限切れ直前に再取得するための判定材料
- JWT を decode させないため、**期限はサーバが明示的に返す**
- `Cache-Control: private, no-store` ヘッダ必須
- `Content-Type: application/json`

#### 401 Unauthorized

```json
{
    "token": null,
    "reason": "unauthenticated"
}
```

- リダイレクトしない (API として JSON を返す)
- フロント側 fetcher wrapper で 401 を検知して `/` に誘導
- session cookie が無い / 改ざん / `userId` または `slackTeamId` が空文字の場合

#### 500 Internal Server Error

```json
{
    "token": null,
    "reason": "server_error"
}
```

- `SUPABASE_JWT_SECRET` 未設定 / `jose` の署名失敗 / `getSession()` の予期せぬ throw
- サーバ側にログを残す

### 実装雛形

```ts
// src/app/api/auth/session-token/route.ts
import { NextResponse } from 'next/server';
import { getSession, isAuthenticated, issueSupabaseJwt } from '@/features/slack-auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!isAuthenticated(session)) {
            return NextResponse.json(
                { token: null, reason: 'unauthenticated' },
                { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
            );
        }
        const { token, expiresAt } = await issueSupabaseJwt({
            userId: session.userId,
            slackTeamId: session.slackTeamId,
            slackUserId: session.slackUserId,
        });
        return NextResponse.json(
            { token, expiresAt },
            { headers: { 'Cache-Control': 'private, no-store' } },
        );
    } catch (err) {
        console.error('[session-token] failed:', err);
        return NextResponse.json(
            { token: null, reason: 'server_error' },
            { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
}
```

## エラー時の挙動マトリクス

| 状況                                 | レスポンス | クライアント側の動作                            |
| ------------------------------------ | ---------- | ----------------------------------------------- |
| iron-session 有効 + 認証済み         | 200        | token を memory cache → Supabase RPC に注入     |
| session cookie 無し                  | 401        | `clearSessionToken()` → `/` リダイレクト        |
| session cookie 改ざん (decrypt 失敗) | 401        | 同上 (iron-session 側で `defaultSession` 返却)  |
| `userId` / `slackTeamId` が空文字    | 401        | 同上                                            |
| `SUPABASE_JWT_SECRET` 未設定         | 500        | retry 1 回 → 失敗で error toast 表示 + 監視ログ |

## キャッシュ・ヘッダ要件

- `Cache-Control: private, no-store` — 中間 proxy / ブラウザ HTTP cache が JWT を保持しないように
- `Content-Type: application/json; charset=utf-8`
- `X-Content-Type-Options: nosniff` — MIME sniffing 抑制 (deferenseの一環)
- `Vary: Cookie` — cookie 違いで全くレスポンスが変わるため (Cache-Control: no-store と併用してさらに保険)

## CSRF / XSS の整理

### CSRF

- 攻撃者の cross-site から `fetch('/api/auth/session-token')` が呼ばれても:
    - `SameSite=Lax` により cross-site fetch では `tamamori_session` cookie が付かない → 401
    - 仮に付いたとしても、**レスポンスは same-origin にのみ読める** (CORS で拒否)
- → CSRF 経路は実質的に閉じている

### XSS

- JWT は **メモリキャッシュのみ・`localStorage` / `sessionStorage` 禁止**
- XSS で JS 実行されれば `fetch('/api/auth/session-token')` を呼んで JWT を取られる経路は理論上存在 → ただしこれは **iron-session 自体が乗っ取られた状態と等価**で、JWT 単体を守る意味は薄い
- 真の防御は **CSP・入力サニタイズ** (本 Issue のスコープ外)
- ADR-004 で「JWT を使い捨てにする = XSS 時の盗難価値を低下させる」設計意図を明記

## 決定に必要な情報

- [ ] `Vary: Cookie` ヘッダの有無で実害が出るケースがあるか確認 (Vercel edge での挙動)
- [ ] `issueSupabaseJwt` 内で `jti` を `crypto.randomUUID()` で都度発行することの性能影響 (無視できる想定)

## 決着後のタスク化

- `src/app/api/auth/session-token/route.ts` の実装 (上記雛形)
- `__tests__/route.test.ts`:
    - 未認証時 401 + `Cache-Control` ヘッダ
    - 認証済み時 200 + `token` + `expiresAt` + `Cache-Control` ヘッダ
    - `SUPABASE_JWT_SECRET` 未設定時の 500
- `src/features/slack-auth/api/supabase-jwt.ts` の `issueSupabaseJwt` 実装 (戻り値を `{ token, expiresAt }` に揃える)
- ADR-004 のセキュリティ章に「JWT を使い捨てにする意図」を明記
