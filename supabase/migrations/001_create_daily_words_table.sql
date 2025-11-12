-- Create daily_words table for storing daily Wordle words
CREATE TABLE IF NOT EXISTS daily_words (
  id SERIAL PRIMARY KEY,
  word TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on date for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_words_date ON daily_words(date);

-- Add a comment to the table
COMMENT ON TABLE daily_words IS 'Stores the daily Wordle word for each date (Ireland timezone)';

