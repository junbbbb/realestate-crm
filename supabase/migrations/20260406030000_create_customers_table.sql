CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  memo text,
  interested_in text[] DEFAULT '{}',
  budget_min bigint DEFAULT 0,
  budget_max bigint DEFAULT 0,
  preferred_area text,
  preferred_floor text,
  business_type text,
  premium_budget bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_customers" ON customers FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
