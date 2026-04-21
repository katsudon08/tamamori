import type { BonsaiVisualState, GrowthStage } from '../model/types';

import { createServerClient } from '@/shared/lib/supabase';

interface UpdateBonsaiData {
    total_messages?: number;
    total_reactions?: number;
    total_thanks?: number;
    growth_stage?: GrowthStage;
    visual_state?: BonsaiVisualState;
}

/**
 * 指定 user_id の bonsai を tenant filter 付きで 1 件取得する。
 * 認可チェーンの中心的な API: `users!inner` JOIN + `users.slack_team_id` filter により、
 * 他テナントの user_id を渡しても行は返らない (= 越境アクセスが構造的に不可能)。
 *
 * エラー契約 (caller は分けて扱うこと):
 * - PostgrestError `code = 'PGRST116'`: 該当行なし。
 *   「bonsai 未作成」と「他テナント越境」を区別せず同一エラーにする (存在情報を漏らさないため)。
 * - それ以外のコード: DB接続・権限・スキーマ不整合など障害系。
 */
export async function getBonsaiByUserId(userId: string, slackTeamId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('bonsai')
        .select('*, users!inner(slack_team_id)')
        .eq('user_id', userId)
        .eq('users.slack_team_id', slackTeamId)
        .single();
    if (error) throw error;
    return data;
}

/**
 * 新規 bonsai レコードを作成する。
 *
 * 注意: tenant 検証を内包していない「検証済み ID 専用 API」。
 * 呼び出し側で userId が現在セッションのテナントに属することを
 * 検証した上で呼ぶこと (現在の caller は OAuth callback のみ)。
 */
export async function createBonsai(userId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('bonsai')
        .insert({ user_id: userId })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * bonsai を id 直接指定で更新する。
 *
 * 注意: tenant 検証を内包していない「検証済み ID 専用 API」。
 * 呼び出し側で id が `getBonsaiByUserId(userId, slackTeamId)` の結果に由来する
 * 検証済み ID であることを保証した上で呼ぶこと (現在の caller は process-event のみ)。
 */
export async function updateBonsai(id: string, updateData: UpdateBonsaiData) {
    const supabase = createServerClient();
    const { data, error } = await supabase.from('bonsai').update(updateData).eq('id', id).single();
    if (error) throw error;
    return data;
}
