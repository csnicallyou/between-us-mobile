ALTER TABLE push_tokens ADD COLUMN categories text[] NOT NULL DEFAULT ARRAY['chat','plan','journal','memory','agreement'];
