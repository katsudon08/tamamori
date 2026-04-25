-- PoC 用の一時セットアップ
-- 検証後は poc-access-token-teardown.sql で削除すること

-- 1. PoC 用テナント A/B のユーザーを seed (既存データに追加)
INSERT INTO users (id, slack_user_id, slack_team_id, display_name)
VALUES
    ('a1111111-0000-4000-a000-000000000001'::uuid, 'U_POC_A', 'T_POC_TEAM_A', 'POC User A'),
    ('a2222222-0000-4000-a000-000000000002'::uuid, 'U_POC_B', 'T_POC_TEAM_B', 'POC User B')
ON CONFLICT (slack_user_id) DO UPDATE SET
    slack_team_id = EXCLUDED.slack_team_id,
    display_name = EXCLUDED.display_name;

INSERT INTO bonsai (id, user_id, total_messages, total_reactions, total_thanks)
VALUES
    ('b1111111-0000-4000-a000-000000000001'::uuid, 'a1111111-0000-4000-a000-000000000001'::uuid, 0, 0, 0),
    ('b2222222-0000-4000-a000-000000000002'::uuid, 'a2222222-0000-4000-a000-000000000002'::uuid, 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;

-- 2. #75 の denormalize を模す: bonsai に slack_team_id を追加 + backfill
ALTER TABLE bonsai ADD COLUMN IF NOT EXISTS slack_team_id TEXT;
UPDATE bonsai SET slack_team_id = u.slack_team_id
    FROM users u WHERE bonsai.user_id = u.id AND bonsai.slack_team_id IS NULL;

-- 3. Realtime + RLS が機能するための要件
ALTER TABLE bonsai REPLICA IDENTITY FULL;

-- 4. PoC 用 authenticated SELECT ポリシー (カラム直接参照型)
CREATE POLICY "poc_authenticated_select_users"
    ON users
    FOR SELECT
    TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

CREATE POLICY "poc_authenticated_select_bonsai"
    ON bonsai
    FOR SELECT
    TO authenticated
    USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));
