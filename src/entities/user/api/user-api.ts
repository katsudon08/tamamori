import { createServerClient } from '@/shared/lib/supabase';

interface UpsertUserData {
    slack_user_id: string;
    slack_team_id: string;
    display_name: string;
    avatar_url: string | null;
}

// onConflict に (slack_user_id, slack_team_id) 複合キーを指定している理由:
// 「同じ slack_user_id が別テナントに所属している」ケース (Enterprise Grid 跨ぎ
// や workspace 移行時の遺存データ等) で誤って team_id を上書きしないため、
// テナント境界を跨ぐ衝突は発生させない方針。これを支える DB 側制約は
// 009_users_composite_unique.sql の users_slack_user_team_uk。
// callback 側の team_id mismatch チェックは防御的検知として残してよい。
export async function upsertUser(userData: UpsertUserData) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'slack_user_id,slack_team_id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * (slack_user_id, slack_team_id) の組で user を取得する team-aware lookup。
 *
 * 取得と tenant 検証を一体化することで、「lookup 直後に post-check で突合」
 * というパターンに依存しない設計になっている (post-check の前に副作用が
 * 差し込まれるリグレッションを構造的に防ぐ)。
 *
 * エラー契約 (caller は分けて扱うこと):
 * - PostgrestError `code = 'PGRST116'`: 未登録 または 別テナント所属。
 *   区別せず同一エラーにする (存在情報を漏らさないため)。
 * - それ以外のコード: DB接続・権限・スキーマ不整合など障害系。
 */
export async function getUserBySlackIdAndTeamId(slackUserId: string, slackTeamId: string) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('slack_user_id', slackUserId)
        .eq('slack_team_id', slackTeamId)
        .single();
    if (error) throw error;
    return data;
}
