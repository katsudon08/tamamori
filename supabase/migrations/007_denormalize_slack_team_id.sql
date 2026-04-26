-- bonsai / action_log への slack_team_id denormalize
-- + 複合 FK による users.slack_team_id との整合性保証
-- + immutable トリガで slack_team_id 改変を遮断
-- + Realtime + RLS が postgres_changes で機能するための REPLICA IDENTITY FULL
--
-- ADR-004 §決定 4 / 5 / 7 に対応。詳細は docs/review/75/issue/04-schema-integrity.md。

-- ============================================================
-- 1. users に複合 UNIQUE 制約 (複合 FK のターゲットとして必要)
-- ============================================================
ALTER TABLE users
  ADD CONSTRAINT users_id_team_uk UNIQUE (id, slack_team_id);

-- ============================================================
-- 2. bonsai: slack_team_id 列追加 → backfill → NOT NULL → 複合 FK 張替え → INDEX
-- ============================================================
ALTER TABLE bonsai ADD COLUMN slack_team_id TEXT;

UPDATE bonsai
  SET slack_team_id = users.slack_team_id
  FROM users
  WHERE bonsai.user_id = users.id;

ALTER TABLE bonsai ALTER COLUMN slack_team_id SET NOT NULL;

-- 単一カラム FK を撤去し、複合 FK に張り直す。
-- これにより bonsai.slack_team_id と users.slack_team_id がズレた INSERT/UPDATE
-- は DB 側で必ず弾かれる (RLS の信頼根拠)。
ALTER TABLE bonsai DROP CONSTRAINT bonsai_user_id_fkey;
ALTER TABLE bonsai
  ADD CONSTRAINT bonsai_user_team_fk
  FOREIGN KEY (user_id, slack_team_id)
  REFERENCES users (id, slack_team_id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

CREATE INDEX idx_bonsai_slack_team_id ON bonsai(slack_team_id);

-- ============================================================
-- 3. action_log: 同様の denormalize + 複合 FK
-- ============================================================
ALTER TABLE action_log ADD COLUMN slack_team_id TEXT;

UPDATE action_log
  SET slack_team_id = users.slack_team_id
  FROM users
  WHERE action_log.user_id = users.id;

ALTER TABLE action_log ALTER COLUMN slack_team_id SET NOT NULL;

ALTER TABLE action_log DROP CONSTRAINT action_log_user_id_fkey;
ALTER TABLE action_log
  ADD CONSTRAINT action_log_user_team_fk
  FOREIGN KEY (user_id, slack_team_id)
  REFERENCES users (id, slack_team_id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

CREATE INDEX idx_action_log_slack_team_id ON action_log(slack_team_id);

-- ============================================================
-- 4. Realtime + RLS が postgres_changes で正しく機能するための REPLICA IDENTITY
-- ============================================================
-- DEFAULT (PK + 変更カラムのみ WAL に乗る) では、UPDATE 時に slack_team_id が
-- 変更されない場合 WAL に slack_team_id が含まれず、RLS ポリシーが評価できず
-- 自テナントの UPDATE すら届かなくなる (PoC で実証済み)。
ALTER TABLE bonsai REPLICA IDENTITY FULL;
ALTER TABLE action_log REPLICA IDENTITY FULL;

-- ============================================================
-- 5. slack_team_id を immutable にするトリガ
-- ============================================================
-- bonsai.slack_team_id を UPDATE で書き換えると認可の根拠が後から変わる。
-- users.slack_team_id 変更は workspace 統合等の特殊運用でのみ必要となるが、
-- その場合は ad-hoc migration でトリガを一時 DISABLE する運用とする
-- (docs/review/75/issue/04-schema-integrity.md §4-C / 本番導入時 TODO)。
CREATE OR REPLACE FUNCTION prevent_slack_team_id_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slack_team_id IS DISTINCT FROM OLD.slack_team_id THEN
    RAISE EXCEPTION 'slack_team_id is immutable on table %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_team_immutable
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_slack_team_id_update();

CREATE TRIGGER trigger_bonsai_team_immutable
  BEFORE UPDATE ON bonsai
  FOR EACH ROW EXECUTE FUNCTION prevent_slack_team_id_update();

CREATE TRIGGER trigger_action_log_team_immutable
  BEFORE UPDATE ON action_log
  FOR EACH ROW EXECUTE FUNCTION prevent_slack_team_id_update();
