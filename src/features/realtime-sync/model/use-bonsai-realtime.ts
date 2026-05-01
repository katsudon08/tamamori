'use client';

import { useEffect } from 'react';
import { useSWRConfig } from 'swr';

import { createBrowserClient, getSessionToken, onTokenRefresh } from '@/shared/lib/supabase';
import type { Database } from '@/shared/lib/supabase';

type BonsaiRow = Database['public']['Tables']['bonsai']['Row'];

/**
 * 単一 user の bonsai UPDATE を購読する。
 *
 * 設計要件 (PoC 由来 / ADR-004 §決定 6):
 * - createBrowserClient はフック内で呼ぶ (モジュールシングルトン撤去)
 * - subscribe 前に **必ず `await supabase.realtime.setAuth(token)` を呼ぶ**。
 *   accessToken オプションの auto-setAuth は fire-and-forget で race するため、
 *   これを怠ると postgres_changes RLS が anon ロールで評価されて他テナント
 *   UPDATE が漏れる (PoC で実証済み)。
 * - postgres_changes filter は単一カラムのみサポートするため、購読側 filter は
 *   `slack_team_id=eq.${slackTeamId}` を採用 (RLS と同じ列で二重防御)。
 *   配信される行は user_id != userId のものも含まれる可能性があるため、callback
 *   内で対象 user_id 以外は mutate しない (= 自分の bonsai キャッシュは触らない)。
 * - JWT が再発行されたら onTokenRefresh で **同じ supabase インスタンス** に
 *   `realtime.setAuth(newToken)` を流す (TTL ロールオーバー時の認証維持)。
 *   cleanup 時には unsubscribe + removeChannel の両方を行う。
 */
export function useBonsaiRealtime(userId: string | undefined, slackTeamId: string | undefined) {
    const { mutate } = useSWRConfig();

    useEffect(() => {
        if (!userId || !slackTeamId) return;

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
                    .channel(`bonsai-changes-${slackTeamId}-${userId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'bonsai',
                            filter: `slack_team_id=eq.${slackTeamId}`,
                        },
                        (payload) => {
                            const newRow = payload.new as BonsaiRow;
                            // tenant 内のうち、自分以外の bonsai UPDATE は無視
                            // (mutate('all-bonsai') は花壇ビュー側の hook が担当)
                            if (newRow.user_id !== userId) return;
                            mutate(['bonsai', newRow.user_id]);
                        },
                    )
                    .subscribe();
            } catch (err) {
                console.error('[useBonsaiRealtime] subscribe failed:', err);
            }
        })();

        return () => {
            cancelled = true;
            unsubscribeRefresh();
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [userId, slackTeamId, mutate]);
}
