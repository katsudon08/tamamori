'use client';

import { useEffect } from 'react';
import { useSWRConfig } from 'swr';

import { createBrowserClient, getSessionToken, onTokenRefresh } from '@/shared/lib/supabase';
import type { Database } from '@/shared/lib/supabase';

type BonsaiRow = Database['public']['Tables']['bonsai']['Row'];

/**
 * テナント全員の bonsai UPDATE を購読する。
 *
 * 設計要件 (PoC 由来 / ADR-004 §決定 6):
 * - createBrowserClient はフック内で呼ぶ (モジュールシングルトン撤去)
 * - subscribe 前に **必ず `await supabase.realtime.setAuth(token)` を呼ぶ**。
 *   accessToken オプションの auto-setAuth は fire-and-forget で race するため、
 *   これを怠ると postgres_changes RLS が anon ロールで評価されて他テナント
 *   UPDATE が漏れる (PoC で実証済み)。
 * - 購読 filter に `slack_team_id=eq.${slackTeamId}` を付け、RLS との二重防御。
 *   RLS が万一バグっても購読側で先に絞られる。
 * - JWT が再発行されたら onTokenRefresh で **同じ supabase インスタンス** に
 *   `realtime.setAuth(newToken)` を流す (TTL ロールオーバー時の認証維持)。
 *   cleanup 時には unsubscribe + removeChannel の両方を行う。
 */
export function useAllBonsaiRealtime(slackTeamId: string | undefined) {
    const { mutate } = useSWRConfig();

    useEffect(() => {
        if (!slackTeamId) return;

        const supabase = createBrowserClient();
        let cancelled = false;
        let channel: ReturnType<typeof supabase.channel> | null = null;
        const unsubscribeRefresh = onTokenRefresh((newToken) => {
            void supabase.realtime.setAuth(newToken);
        });

        (async () => {
            try {
                const token = await getSessionToken();
                if (cancelled) return;
                await supabase.realtime.setAuth(token);
                if (cancelled) return;

                channel = supabase
                    .channel(`bonsai-changes-all-${slackTeamId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'bonsai',
                            filter: `slack_team_id=eq.${slackTeamId}`,
                        },
                        (payload) => {
                            mutate('all-bonsai');
                            const newRow = payload.new as BonsaiRow;
                            if (newRow.user_id) {
                                mutate(['bonsai', newRow.user_id]);
                            }
                        },
                    )
                    .subscribe();
            } catch (err) {
                console.error('[useAllBonsaiRealtime] subscribe failed:', err);
            }
        })();

        return () => {
            cancelled = true;
            unsubscribeRefresh();
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [slackTeamId, mutate]);
}
