CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name varchar(80) NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_normalized CHECK (email = lower(email))
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL,
  relationship_started_on date,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pair_members (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  member_slot varchar(8) NOT NULL CHECK (member_slot IN ('owner','partner')),
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pair_members_pair_id_idx ON pair_members(pair_id);
CREATE UNIQUE INDEX pair_members_pair_slot_unique ON pair_members(pair_id, member_slot);

CREATE TABLE pair_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  code_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  redeemed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pair_invites_pair_active_idx ON pair_invites(pair_id, expires_at)
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens(family_id);

CREATE TABLE entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind varchar(32) NOT NULL CHECK (kind IN ('plan','journal','memory','about','agreement','conflict')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entries_pair_kind_updated_idx ON entries(pair_id, kind, updated_at DESC, id DESC);

CREATE TABLE moods (
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood varchar(16) CHECK (mood IN ('calm','happy','tender','anxious','sad','angry','tired','neutral')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(pair_id, user_id)
);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content varchar(4000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_pair_created_idx ON chat_messages(pair_id, created_at DESC, id DESC);

CREATE TABLE private_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  nonce bytea NOT NULL,
  auth_tag bytea NOT NULL,
  ciphertext bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX private_feedback_pair_created_idx ON private_feedback(pair_id, created_at DESC);

CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  storage_name varchar(100) NOT NULL UNIQUE,
  original_name varchar(255) NOT NULL,
  mime_type varchar(80) NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_pair_created_idx ON media(pair_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
