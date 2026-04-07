CREATE INDEX IF NOT EXISTS idx_properties_is_my_listing ON properties(is_my_listing) WHERE is_my_listing = true;
