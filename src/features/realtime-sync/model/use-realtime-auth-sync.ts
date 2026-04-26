'use client';

import { useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { onTokenRefresh } from '@/shared/lib/supabase';

/**
 * token-cache から再発行された JWT を Realtime の WebSocket に同期する。
 *
 * 目的: TTL ロールオーバー時の挙動を明示パターンに固定する (ADR-004 §決定 6)。
 *
 * 接続中のチャネルを維持したまま auth を更新できるため、再購読のオーバーヘッド
 * なしで他テナント混入リスクを避けられる。テナント切替 (logout / 再ログイン) は
 * 別経路で `removeAllChannels()` + client 再生成を行う。
 */
export function useRealtimeAuthSync(supabase: SupabaseClient): void {
    useEffect(() => {
        const unsubscribe = onTokenRefresh((newToken) => {
            // setAuth は同期/非同期どちらでもよいが、戻り値を待たずに登録だけ済ます
            void supabase.realtime.setAuth(newToken);
        });
        return unsubscribe;
    }, [supabase]);
}
