-- users.slack_user_id 単独 UNIQUE を (slack_user_id, slack_team_id) 複合 UNIQUE へ変更。
--
-- 背景:
--   slack_user_id は Slack 内ではグローバル一意とされているが、Workspace 移行や
--   Enterprise Grid 跨ぎ等でテナント境界を跨ぐ衝突が発生し得る前提を排除する。
--   #75 (RLS テナント分離) では「同じ slack_user_id の別テナント所属」が起きた
--   場合に upsert が誤って team を上書きするリスクを構造的に塞ぐ必要がある。
--
-- 注:
--   既存の users_id_team_uk (id, slack_team_id) は bonsai/action_log の複合 FK
--   ターゲットとして必須なので残す。今回追加するのは別の制約。
--
-- 順序:
--   1. 複合 UNIQUE を先に追加 (既存データ衝突有無を検出)
--   2. 旧 users_slack_user_id_key を DROP
--   両者を別トランザクションにせず連続適用する想定。
--   旧 key が FK のターゲットになっていない (bonsai は users(id) ではなく
--   今は users(id, slack_team_id) を参照) ため安全に DROP できる。

ALTER TABLE users
  ADD CONSTRAINT users_slack_user_team_uk UNIQUE (slack_user_id, slack_team_id);

-- 旧 idx_users_slack_user_id (btree) は読み取り高速化のため残す。
-- DROP するのは UNIQUE 制約のみ。
ALTER TABLE users DROP CONSTRAINT users_slack_user_id_key;
