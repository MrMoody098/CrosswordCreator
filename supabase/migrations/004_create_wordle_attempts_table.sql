-- Create wordle_attempts table to store user attempts
CREATE TABLE IF NOT EXISTS public.wordle_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word_date DATE NOT NULL,
  attempts JSONB NOT NULL, -- Array of guesses with their evaluations
  score INTEGER NOT NULL, -- Number of attempts (1-6, or 7 for failed)
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word_date) -- One attempt per user per day
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wordle_attempts_word_date ON public.wordle_attempts(word_date);
CREATE INDEX IF NOT EXISTS idx_wordle_attempts_user_id ON public.wordle_attempts(user_id);

-- Enable RLS
ALTER TABLE public.wordle_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own attempts
CREATE POLICY "Users can insert their own attempts"
  ON public.wordle_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view all attempts (for leaderboard)
CREATE POLICY "Anyone can view attempts"
  ON public.wordle_attempts
  FOR SELECT
  USING (true);

-- Policy: Users can update their own attempts
CREATE POLICY "Users can update their own attempts"
  ON public.wordle_attempts
  FOR UPDATE
  USING (auth.uid() = user_id);

