-- マルチテナント RLS ポリシー (authenticated ロール向け)
--
-- カスタム JWT (slack_team_id claim) を使って自テナント行のみ SELECT を許可する。
-- 書き込み (INSERT/UPDATE/DELETE) はアプリ層の service_role 経由のみで行うため
-- ポリシーを追加しない (= デフォルト DENY)。
--
-- ポリシーは **自テーブルの slack_team_id を直接参照** する形に統一する。
-- JOIN/EXISTS で users.slack_team_id を引く形は postgres_changes RLS が
-- 評価できず他テナント UPDATE が漏れることを PoC で確認済み (ADR-004 §決定 4)。
--
-- 旧 anon_select_* ポリシーは新ポリシー追加後に DROP する (順序を逆にすると
-- ポリシー切替の瞬間に SELECT が空になる)。
--
-- ADR-004 §決定 4 / docs/review/75/issue/05-migration-rollout.md §008 に対応。

-- ============================================================
-- 1. 新ポリシー追加 (authenticated 向け SELECT)
-- ============================================================

CREATE POLICY "authenticated_select_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

CREATE POLICY "authenticated_select_bonsai"
  ON bonsai
  FOR SELECT
  TO authenticated
  USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

CREATE POLICY "authenticated_select_action_log"
  ON action_log
  FOR SELECT
  TO authenticated
  USING (slack_team_id = (auth.jwt() ->> 'slack_team_id'));

-- growth_rules はテナント非依存 (全員参照可)
CREATE POLICY "authenticated_select_growth_rules"
  ON growth_rules
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 2. 旧 anon ポリシーの DROP (新ポリシー追加後)
-- ============================================================

DROP POLICY "anon_select_users" ON users;
DROP POLICY "anon_select_bonsai" ON bonsai;
DROP POLICY "anon_select_action_log" ON action_log;
DROP POLICY "anon_select_growth_rules" ON growth_rules;
