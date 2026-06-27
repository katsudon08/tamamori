import useSWR from "swr";

/**
 * 認証済みユーザーの最小プロフィール。
 * Next backend の暫定 `GET /api/auth/me`(iron-session 由来) から取得する。
 * #94 で apps/api(Hono) の正式エンドポイントへ差し替える。
 */
export interface Me {
  userId: string;
  slackUserId: string;
  slackTeamId: string;
  displayName: string;
  avatarUrl: string;
}

/**
 * 認証状態を hydrate する SWR フック。
 * - 200: `Me` を返す
 * - 401: 未認証として `null` を返す(エラーにしない)
 * proxy 経由で Cookie(tamamori_session) が same-origin で届く前提(vite server.proxy)。
 */
export function useMe() {
  return useSWR<Me | null>(
    "/api/auth/me",
    async (url: string) => {
      const res = await fetch(url, { credentials: "same-origin" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`auth/me failed: ${res.status}`);
      return (await res.json()) as Me;
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
}
