import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { getSessionToken } from "./token-cache";

/**
 * ブラウザ用 Supabase クライアントを生成する。
 *
 * - 認可は iron-session 由来の独自 JWT (`/api/auth/session-token`) を `accessToken`
 *   関数オプション経由で都度注入する。Supabase 自身の auth cookie は使わない。
 * - REST には `accessToken` から自動で Bearer ヘッダが付与される。
 * - Realtime は同じ関数を内部で呼ぶが、postgres_changes RLS を確実に評価させる
 *   ためには **subscribe 前に `await client.realtime.setAuth(jwt)` を明示的に
 *   呼ぶ必要がある** (auto-setAuth は fire-and-forget で race する)。
 *   詳細は ADR-004 §決定 6 / docs/review/75/issue/03-realtime-auth.md。
 */
export function createClient() {
  return createSupabaseClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      accessToken: async () => getSessionToken(),
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
