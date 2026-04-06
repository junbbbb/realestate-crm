CREATE TABLE IF NOT EXISTS crawl_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('success', 'error')),
  total_count integer NOT NULL DEFAULT 0,
  new_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  duration text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_crawl_logs" ON crawl_logs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
