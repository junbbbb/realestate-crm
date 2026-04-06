ALTER TABLE collections ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
