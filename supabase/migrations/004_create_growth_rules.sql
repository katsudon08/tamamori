-- growth_rules テーブル
CREATE TABLE growth_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage         TEXT UNIQUE NOT NULL,
  min_messages  INT NOT NULL,
  min_reactions INT NOT NULL,
  min_thanks    INT NOT NULL,
  sort_order    INT NOT NULL
);

-- 初期データ
INSERT INTO growth_rules (stage, min_messages, min_reactions, min_thanks, sort_order) VALUES
  ('seed',        0,   0,   0,  0),
  ('sprout',      5,   0,   0,  1),
  ('young',      15,   5,   0,  2),
  ('branching',  30,  15,   3,  3),
  ('leafy',      60,  30,  10,  4),
  ('budding',   100,  50,  20,  5),
  ('flowering', 150,  80,  35,  6),
  ('full_bloom', 250, 120,  60,  7);
