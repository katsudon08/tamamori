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
 * 認可チェーンの中心的な API: bonsai.slack_team_id (denormalize 列) を直接参照
 * してテナント境界を確立する。RLS ポリシーと同じ列を参照することで
 * 「アプリ層 filter と RLS の意図が一致する」状態にしている。
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
        .select('*')
        .eq('user_id', userId)
        .eq('slack_team_id', slackTeamId)
        .single();
    if (error) throw error;
    return data;
}

/**
 * 新規 bonsai レコードを作成する。
 *
 * 注意: tenant 検証を内包していない「検証済み ID 専用 API」。
 * 呼び出し側で (userId, slackTeamId) が現在セッションのテナントに属する
 * 検証済みの組み合わせであることを保証した上で呼ぶこと
 * (現在の caller は OAuth callback のみ)。
 *
 * INSERT 時に slack_team_id をセットしないと NOT NULL 制約 + 複合 FK で弾かれる。
 */
export async function createBonsai(userId: string, slackTeamId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('bonsai')
        .insert({ user_id: userId, slack_team_id: slackTeamId })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * bonsai を (id, slackTeamId) 指定で更新する。
 *
 * service_role 経由 (= RLS バイパス) なので、id 単独で UPDATE すると tenant
 * 境界がアプリ層に依存してしまう。caller のバグ・誤った id 渡しによる
 * 越境書き込みを構造的に防ぐため、API 自体で slack_team_id filter を持つ。
 * caller (process-event) は user lookup の検証済み slack_team_id を渡すこと。
 */
export async function updateBonsai(id: string, slackTeamId: string, updateData: UpdateBonsaiData) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('bonsai')
        .update(updateData)
        .eq('id', id)
        .eq('slack_team_id', slackTeamId)
        .single();
    if (error) throw error;
    return data;
}
