-- E2E テスト用シードデータ
-- e2e/helpers/auth.ts および e2e/helpers/supabase.ts のテナント定義と一致させること
-- TENANT_A は既存 E2E が依存。TENANT_B は #75 RLS の tenant 分離検証用。

-- TENANT A: 既存 E2E のデフォルトユーザー
INSERT INTO users (id, slack_user_id, slack_team_id, display_name, avatar_url)
VALUES (
  'a0000000-0000-4000-a000-000000000001',
  'U_E2E_TEST',
  'T_E2E_TEST',
  'E2E Test User',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- TENANT A の盆栽（visual_state は 002_create_bonsai.sql の DEFAULT と同じ）
INSERT INTO bonsai (user_id, slack_team_id, growth_stage, visual_state)
VALUES (
  'a0000000-0000-4000-a000-000000000001',
  'T_E2E_TEST',
  'seed',
  '{
    "trunkHeight": 0.3,
    "trunkThickness": 0.05,
    "branches": [],
    "leaves": 0,
    "leafColor": "#228B22",
    "flowers": 0,
    "flowerColor": "#FFB7C5",
    "potColor": "#8B4513"
  }'::jsonb
)
ON CONFLICT (user_id) DO NOTHING;

-- TENANT B: tenant 分離検証用 (E2E `tenant-isolation.spec.ts` から参照)
-- TENANT A と異なる slack_team_id で seed され、SSR / SWR / Realtime の各経路で
-- TENANT A 側のクエリ結果に含まれないことを検証する。
INSERT INTO users (id, slack_user_id, slack_team_id, display_name, avatar_url)
VALUES (
  'b0000000-0000-4000-b000-000000000002',
  'U_E2E_TEST_B',
  'T_E2E_TEST_B',
  'E2E Test User B',
  ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bonsai (user_id, slack_team_id, growth_stage, visual_state)
VALUES (
  'b0000000-0000-4000-b000-000000000002',
  'T_E2E_TEST_B',
  'seed',
  '{
    "trunkHeight": 0.3,
    "trunkThickness": 0.05,
    "branches": [],
    "leaves": 0,
    "leafColor": "#228B22",
    "flowers": 0,
    "flowerColor": "#FFB7C5",
    "potColor": "#8B4513"
  }'::jsonb
)
ON CONFLICT (user_id) DO NOTHING;
