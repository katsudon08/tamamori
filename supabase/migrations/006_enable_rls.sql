-- RLS (Row Level Security) の有効化
-- すべてのテーブルに RLS を適用し、anon ロールには SELECT のみ許可する。
-- INSERT / UPDATE / DELETE はサーバーサイドの service_role key 経由のみ（RLS バイパス）。

-- ============================================================
-- users
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_users"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- bonsai
-- ============================================================
ALTER TABLE bonsai ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_bonsai"
  ON bonsai
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- action_log
-- ============================================================
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_action_log"
  ON action_log
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- growth_rules
-- ============================================================
ALTER TABLE growth_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_growth_rules"
  ON growth_rules
  FOR SELECT
  TO anon
  USING (true);
