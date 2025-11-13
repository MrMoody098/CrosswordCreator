-- Create table for marketplace crosswords
CREATE TABLE marketplace_crosswords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  grid_csv TEXT NOT NULL,
  clues_csv TEXT NOT NULL,
  author_name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for faster queries
CREATE INDEX idx_marketplace_crosswords_created_at ON marketplace_crosswords(created_at DESC);
CREATE INDEX idx_marketplace_crosswords_downloads ON marketplace_crosswords(downloads DESC);
CREATE INDEX idx_marketplace_crosswords_rating ON marketplace_crosswords(rating DESC);
CREATE INDEX idx_marketplace_crosswords_is_featured ON marketplace_crosswords(is_featured);
CREATE INDEX idx_marketplace_crosswords_is_active ON marketplace_crosswords(is_active);
CREATE INDEX idx_marketplace_crosswords_display_name ON marketplace_crosswords(display_name);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_crosswords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_marketplace_crosswords_updated_at
  BEFORE UPDATE ON marketplace_crosswords
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_crosswords_updated_at();

