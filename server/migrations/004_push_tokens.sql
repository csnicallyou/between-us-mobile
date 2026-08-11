CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL UNIQUE,
  platform varchar(16) NOT NULL CHECK (platform IN ('ios','android')),
  quiet_hours_start smallint CHECK (quiet_hours_start BETWEEN 0 AND 23),
  quiet_hours_end smallint CHECK (quiet_hours_end BETWEEN 0 AND 23),
  timezone varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_tokens_user_idx ON push_tokens(user_id);
