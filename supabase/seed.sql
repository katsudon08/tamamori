-- E2E テスト用シードデータ
-- e2e/helpers/auth.ts のデフォルトセッション値と一致させること

-- テストユーザー
INSERT INTO users (id, slack_user_id, slack_team_id, display_name, avatar_url)
VALUES (
  'a0000000-0000-4000-a000-000000000001',
  'U_E2E_TEST',
  'T_E2E_TEST',
  'E2E Test User',
  ''
)
ON CONFLICT (id) DO NOTHING;

-- テストユーザーの盆栽（visual_state は 002_create_bonsai.sql の DEFAULT と同じ）
INSERT INTO bonsai (user_id, growth_stage, visual_state)
VALUES (
  'a0000000-0000-4000-a000-000000000001',
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
