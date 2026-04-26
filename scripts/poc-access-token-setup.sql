-- PoC 用の一時セットアップ (post-007/008 版)
-- 007/008 マイグレーション適用後の状態で動かす想定。
-- 検証後は poc-access-token-teardown.sql で削除すること。

-- 1. PoC 用テナント A/B のユーザーを seed
INSERT INTO users (id, slack_user_id, slack_team_id, display_name)
VALUES
    ('a1111111-0000-4000-a000-000000000001'::uuid, 'U_POC_A', 'T_POC_TEAM_A', 'POC User A'),
    ('a2222222-0000-4000-a000-000000000002'::uuid, 'U_POC_B', 'T_POC_TEAM_B', 'POC User B')
ON CONFLICT (slack_user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name;
-- 注: slack_team_id は immutable トリガで UPDATE 拒否されるため ON CONFLICT で更新しない

-- 2. PoC 用 bonsai を seed (slack_team_id を必ずセット — 複合 FK + NOT NULL)
INSERT INTO bonsai (id, user_id, slack_team_id, total_messages, total_reactions, total_thanks)
VALUES
    (
        'b1111111-0000-4000-a000-000000000001'::uuid,
        'a1111111-0000-4000-a000-000000000001'::uuid,
        'T_POC_TEAM_A',
        0, 0, 0
    ),
    (
        'b2222222-0000-4000-a000-000000000002'::uuid,
        'a2222222-0000-4000-a000-000000000002'::uuid,
        'T_POC_TEAM_B',
        0, 0, 0
    )
ON CONFLICT (user_id) DO NOTHING;

-- 注: 008 マイグレーションで authenticated_select_users / authenticated_select_bonsai が
-- 既に存在するため、PoC 用ポリシーは不要 (実装そのものを検証する)。
