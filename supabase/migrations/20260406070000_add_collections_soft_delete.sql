ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
