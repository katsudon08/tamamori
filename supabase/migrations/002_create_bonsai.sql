-- bonsai テーブル
CREATE TABLE bonsai (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_messages  INT NOT NULL DEFAULT 0,
  total_reactions INT NOT NULL DEFAULT 0,
  total_thanks    INT NOT NULL DEFAULT 0,
  growth_stage    TEXT NOT NULL DEFAULT 'seed'
                  CHECK (growth_stage IN (
                    'seed', 'sprout', 'young', 'branching',
                    'leafy', 'budding', 'flowering', 'full_bloom'
                  )),
  visual_state    JSONB NOT NULL DEFAULT '{
    "trunkHeight": 0.3,
    "trunkThickness": 0.05,
    "branches": [],
    "leaves": 0,
    "leafColor": "#228B22",
    "flowers": 0,
    "flowerColor": "#FFB7C5",
    "potColor": "#8B4513"
  }'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bonsai_user_id ON bonsai(user_id);

-- bonsai テーブルの updated_at トリガー
CREATE TRIGGER trigger_bonsai_updated_at
  BEFORE UPDATE ON bonsai
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
