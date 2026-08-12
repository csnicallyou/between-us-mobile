CREATE TABLE data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX data_export_requests_pair_idx ON data_export_requests(pair_id, created_at DESC);
