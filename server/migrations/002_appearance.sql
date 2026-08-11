CREATE TABLE appearances (
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  background_kind varchar(16) NOT NULL DEFAULT 'default' CHECK (background_kind IN ('default','color','image')),
  background_value text,
  background_luminance real NOT NULL DEFAULT 0.95,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pair_id, user_id)
);
