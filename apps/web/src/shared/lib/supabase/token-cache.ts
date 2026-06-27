/**
 * ブラウザ側 Supabase RLS 用 JWT のメモリキャッシュ。
 *
 * - `localStorage` / `sessionStorage` には書かない (XSS 耐性。ADR-004 §決定 2)
 * - `accessToken` 関数オプションから毎呼び出し参照される想定
 * - `/api/auth/session-token` から `{ token, expiresAt }` を取得
 * - 期限残り 60 秒以下になったら次の取得で再 fetch
 * - 並列取得は inflight Promise で 1 本に集約
 * - 401 (iron-session 切れ) はキャッシュをクリアし `session_expired` を throw
 * - `onTokenRefresh` で再取得イベントを購読でき、Realtime の `setAuth` 同期に使う
 * - `clearSessionToken` 後に古い inflight が解決してもキャッシュを復活させない
 */

interface Cached {
  token: string;
  /** Unix epoch (秒) */
  expiresAt: number;
}

interface SessionTokenResponse {
  token: string;
  expiresAt: number;
}

type RefreshCallback = (newToken: string) => void;

/** TTL ロールオーバーのため、残り何秒以下になったら再取得するかのバッファ (秒) */
const REFRESH_BUFFER_SECONDS = 60;

const SESSION_TOKEN_ENDPOINT = "/api/auth/session-token";

let cached: Cached | null = null;
let inflight: Promise<string> | null = null;
let cacheEpoch: symbol = Symbol("token-cache");
const refreshCallbacks = new Set<RefreshCallback>();

/**
 * 現在有効な JWT を返す。期限切れ間近なら再取得する。
 * @throws Error('session_expired') 401 が返った (iron-session が無効)
 * @throws Error 5xx 等の他の HTTP エラー
 */
export async function getSessionToken(): Promise<string> {
  const nowSec = Date.now() / 1000;
  if (cached && cached.expiresAt - nowSec > REFRESH_BUFFER_SECONDS) {
    return cached.token;
  }
  if (inflight) {
    return inflight;
  }

  const epoch = cacheEpoch;
  const currentInflight = fetchAndCache(epoch).finally(() => {
    if (inflight === currentInflight) {
      inflight = null;
    }
  });

  inflight = currentInflight;
  return currentInflight;
}

async function fetchAndCache(epoch: symbol): Promise<string> {
  const res = await fetch(SESSION_TOKEN_ENDPOINT, { credentials: "same-origin" });
  if (epoch !== cacheEpoch) {
    throw new Error("session_token_fetch_cancelled");
  }
  if (res.status === 401) {
    cached = null;
    throw new Error("session_expired");
  }

  if (!res.ok) {
    throw new Error(`session_token_fetch_failed:${res.status}`);
  }

  const body = (await res.json()) as SessionTokenResponse;

  if (epoch !== cacheEpoch) {
    throw new Error("session_token_fetch_cancelled");
  }

  cached = { token: body.token, expiresAt: body.expiresAt };
  refreshCallbacks.forEach((cb) => {
    try {
      cb(body.token);
    } catch (err) {
      // callback 例外で他の subscriber や caller を巻き込まない
      console.error("[token-cache] onTokenRefresh callback threw:", err);
    }
  });
  return body.token;
}

/**
 * メモリキャッシュを破棄する。ログアウト・テナント切替時に呼ぶ。
 * 進行中の inflight Promise は無効化され、解決してもキャッシュや callback は更新しない。
 * 既存の Realtime 購読は別管理のため、テナント切替時は hook 側の再 mount も必要。
 */
export function clearSessionToken(): void {
  cached = null;
  inflight = null;
  cacheEpoch = Symbol("token-cache");
}

/**
 * 新しい JWT が取得されたときに呼ばれる callback を登録する。
 * 戻り値の関数を呼ぶと購読解除される。
 *
 * 主な用途は Realtime: `setAuth(newToken)` で接続中のチャネルに新 JWT を流す。
 */
export function onTokenRefresh(callback: RefreshCallback): () => void {
  refreshCallbacks.add(callback);
  return () => {
    refreshCallbacks.delete(callback);
  };
}
