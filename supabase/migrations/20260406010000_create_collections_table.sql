CREATE TABLE IF NOT EXISTS collections (
  id text PRIMARY KEY,
  name text NOT NULL,
  property_ids text[] DEFAULT '{}',
  entries jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_collections" ON collections FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
