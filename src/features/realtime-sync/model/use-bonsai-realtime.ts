'use client';

import { useEffect } from 'react';
import { useSWRConfig } from 'swr';

import { createBrowserClient, getSessionToken } from '@/shared/lib/supabase';
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
 *
 * Supabase の postgres_changes filter は単一カラムのみサポートするため、
 * テナント絞り込みは RLS (`bonsai.slack_team_id = auth.jwt() ->> 'slack_team_id'`) に
 * 委ね、購読 filter は `user_id=eq.${userId}` を採用する。`bonsai.user_id` は
 * UNIQUE のため user_id 単独でも一意。
 *
 * `slackTeamId` 引数は subscribe の前提条件ガード + FSD 型契約 (テナント ID が
 * 必須であることを呼び出し側に明示) のために受け取る。
 */
export function useBonsaiRealtime(userId: string | undefined, slackTeamId: string | undefined) {
    const { mutate } = useSWRConfig();

    useEffect(() => {
        if (!userId || !slackTeamId) return;

        const supabase = createBrowserClient();
        let cancelled = false;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        (async () => {
            try {
                const token = await getSessionToken();
                if (cancelled) return;
                await supabase.realtime.setAuth(token);
                if (cancelled) return;

                channel = supabase
                    .channel(`bonsai-changes-${userId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'bonsai',
                            filter: `user_id=eq.${userId}`,
                        },
                        (payload) => {
                            const newRow = payload.new as BonsaiRow;
                            if (newRow.user_id) {
                                mutate(['bonsai', newRow.user_id]);
                            }
                            mutate('all-bonsai');
                        },
                    )
                    .subscribe();
            } catch (err) {
                console.error('[useBonsaiRealtime] subscribe failed:', err);
            }
        })();

        return () => {
            cancelled = true;
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [userId, slackTeamId, mutate]);
}
