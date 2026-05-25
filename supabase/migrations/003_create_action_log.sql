-- action_log テーブル
CREATE TABLE action_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type     TEXT NOT NULL CHECK (action_type IN ('message', 'reaction', 'thanks')),
  slack_event_id  TEXT UNIQUE,
  slack_channel   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_log_user_created ON action_log(user_id, created_at DESC);
CREATE INDEX idx_action_log_event_id ON action_log(slack_event_id);
CREATE INDEX idx_action_log_type ON action_log(action_type, created_at DESC);
