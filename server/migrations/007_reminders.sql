CREATE TABLE agreement_reminders (
  entry_id uuid PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
  last_sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memory_anniversary_reminders (
  entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  year_sent integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, year_sent)
);
