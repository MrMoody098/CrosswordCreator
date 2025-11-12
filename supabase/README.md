# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Create a new project
3. Choose a region (preferably close to Ireland for better performance)
4. Note your project URL and anon key from Settings > API

## 2. Create Database Table

Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor):

```sql
CREATE TABLE daily_words (
  id SERIAL PRIMARY KEY,
  word TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on date for faster lookups
CREATE INDEX idx_daily_words_date ON daily_words(date);
```

## 3. Set Up Edge Function

1. Install Supabase CLI (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the Edge Function:
   ```bash
   supabase functions deploy get-daily-word
   ```

## 4. API Configuration

The Edge Function uses the **Random Words API** which doesn't require an API key. No additional setup needed!

## 5. Environment Variables

### For Local Development

Create a `.env` file in the root directory with your Supabase credentials:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** This is a Vite project, so environment variables must use the `VITE_` prefix (not `REACT_APP_`).

### For GitHub Pages Deployment

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

The GitHub Actions workflow will automatically use these secrets during the build process.

## 6. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to the Daily Wordl page
3. The Edge Function should fetch and store a word for today

## Troubleshooting

- If you get CORS errors, make sure the Edge Function has the correct CORS headers (already included)
- If the function fails, check the Supabase Edge Function logs in the dashboard
- Verify the `daily_words` table exists and has the correct schema
- If the Random Words API is unavailable, the function will fall back to a local word list

