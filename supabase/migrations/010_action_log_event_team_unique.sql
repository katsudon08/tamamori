-- action_log の冪等性キーを tenant-aware にする。
--
-- 旧仕様では slack_event_id 単独 UNIQUE だったため、Slack event_id が
-- workspace を跨いで衝突した場合に別テナントのイベントまで重複扱いに
-- なり得た。アプリ層の checkEventExists も slack_team_id で絞るため、
-- DB 制約も (slack_event_id, slack_team_id) に揃える。

ALTER TABLE action_log
  DROP CONSTRAINT IF EXISTS action_log_slack_event_id_key;

ALTER TABLE action_log
  ADD CONSTRAINT action_log_event_team_uk UNIQUE (slack_event_id, slack_team_id);
