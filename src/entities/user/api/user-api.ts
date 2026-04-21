import { createServerClient } from '@/shared/lib/supabase';

interface UpsertUserData {
    slack_user_id: string;
    slack_team_id: string;
    display_name: string;
    avatar_url: string | null;
}

// onConflict に slack_user_id 単独を指定している理由:
// Slack のユーザーIDはワークスペースを跨いでグローバル一意 (ある U01XXXX は
// どの team に所属しても同一人物を指す) であるため、単独キーで衝突判定して
// よい。この前提が崩れる (別 team の slack_user_id が衝突する) と、
// session.slackTeamId を起点とするテナント認可全体の整合性が崩れるため、
// 呼び出し側 (callback) で戻り値の slack_team_id を検証している。
// 前提を変える場合は users の一意制約と upsert 戦略を
// (slack_user_id, slack_team_id) 複合キーへ見直すこと。
export async function upsertUser(userData: UpsertUserData) {
    const supabase = createServerClient();
    const { data, error } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'slack_user_id' })
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
