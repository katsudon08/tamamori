-- PoC 検証後のクリーンアップ

DROP POLICY IF EXISTS "poc_authenticated_select_users" ON users;
DROP POLICY IF EXISTS "poc_authenticated_select_bonsai" ON bonsai;

ALTER TABLE bonsai REPLICA IDENTITY DEFAULT;
ALTER TABLE bonsai DROP COLUMN IF EXISTS slack_team_id;

DELETE FROM bonsai WHERE id IN (
    'b1111111-0000-4000-a000-000000000001'::uuid,
    'b2222222-0000-4000-a000-000000000002'::uuid
);
DELETE FROM users WHERE id IN (
    'a1111111-0000-4000-a000-000000000001'::uuid,
    'a2222222-0000-4000-a000-000000000002'::uuid
);
