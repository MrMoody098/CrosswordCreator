# Daily Wordle Setup Guide

This guide will help you set up the Daily Wordle feature.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Follow the instructions in `supabase/README.md`
   - Create the database table using `supabase/migrations/001_create_daily_words_table.sql`
   - Deploy the Edge Function

3. **Configure environment variables:**
   
   **For Local Development:**
   - Create a `.env` file in the root directory
   - Add your Supabase credentials (use `VITE_` prefix, not `REACT_APP_`):
     ```
     VITE_SUPABASE_URL=https://your-project-ref.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```
   
   **For GitHub Pages:**
   - Go to your GitHub repository > Settings > Secrets and variables > Actions
   - Add secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - The deployment workflow will use these automatically

4. **No API key needed!** The Edge Function uses the Random Words API which doesn't require authentication.

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Features Implemented

- ✅ Daily Wordle game with 6 guesses
- ✅ Virtual keyboard with color feedback
- ✅ Word validation and evaluation (green/yellow/gray)
- ✅ Local storage caching to avoid unnecessary API calls
- ✅ Supabase Edge Function for daily word management
- ✅ WordsAPI integration with fallback word list
- ✅ Ireland timezone support
- ✅ Styled to match crossword website theme
- ✅ Responsive design for mobile devices

## File Structure

- `src/components/Wordle.jsx` - Main Wordle game component
- `src/components/Wordle.css` - Wordle styling
- `src/utils/wordleApi.js` - API service for fetching daily words
- `src/utils/localStorage.js` - Wordle localStorage utilities
- `supabase/functions/get-daily-word/index.ts` - Edge Function
- `supabase/migrations/001_create_daily_words_table.sql` - Database migration

## How It Works

1. User clicks "Daily Wordl" button on home page
2. Frontend checks localStorage for today's word
3. If not found, calls Supabase Edge Function
4. Edge Function checks database for today's word (Ireland timezone)
5. If not found, fetches random 5-letter word from WordsAPI
6. Ensures word hasn't been used before
7. Stores word in database and returns it
8. Frontend caches word in localStorage
9. User plays Wordle game with the daily word

## Troubleshooting

- **"Supabase client not configured"**: Make sure `.env` file exists with correct values
- **Edge Function errors**: Check Supabase dashboard logs and verify RAPIDAPI_KEY is set
- **Word not loading**: Check browser console and Supabase Edge Function logs
- **CORS errors**: Edge Function already includes CORS headers, but verify they're correct

## Next Steps (Future Enhancements)

- User statistics tracking (wins, streaks, guess distribution)
- User accounts and progress persistence
- Share results functionality
- Word history viewer

