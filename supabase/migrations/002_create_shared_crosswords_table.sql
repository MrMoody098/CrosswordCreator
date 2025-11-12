-- Create table for shared crosswords
CREATE TABLE shared_crosswords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT NOT NULL UNIQUE,
  grid_csv TEXT NOT NULL,
  clues_csv TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create an index on share_id for faster lookups
CREATE INDEX idx_shared_crosswords_share_id ON shared_crosswords(share_id);

-- Create an index on created_at for cleanup queries
CREATE INDEX idx_shared_crosswords_created_at ON shared_crosswords(created_at);

