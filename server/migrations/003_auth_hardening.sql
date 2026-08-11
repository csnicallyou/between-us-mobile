ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

CREATE TABLE email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash char(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_verifications_user_idx ON email_verifications(user_id, created_at DESC);

CREATE TABLE password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_resets_user_idx ON password_resets(user_id);

ALTER TABLE refresh_tokens ADD COLUMN device_label varchar(120);
ALTER TABLE refresh_tokens ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX refresh_tokens_active_idx ON refresh_tokens(user_id, family_id) WHERE revoked_at IS NULL;
