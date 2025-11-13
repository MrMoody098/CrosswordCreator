# Complete Deployment Guide

This guide covers deploying the entire Crossword Creator application, including Supabase migrations, Edge Functions, and the frontend.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install globally:
   ```bash
   npm install -g supabase
   ```
3. **GitHub Account**: For hosting the frontend
4. **Node.js**: Version 18 or higher

## Step 1: Supabase Project Setup

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: CrosswordCreator (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users (Ireland recommended for timezone)
4. Wait for project to be created (2-3 minutes)
5. Note your **Project URL** and **Anon Key** from Settings > API

### 1.2 Link Local Project to Supabase

1. Login to Supabase CLI:
   ```bash
   supabase login
   ```
   (This will open a browser for authentication)

2. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Replace `YOUR_PROJECT_REF` with your project reference (found in your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co`)

   Example:
   ```bash
   supabase link --project-ref vpmmcdwcxatfhyysiamg
   ```

## Step 2: Deploy Supabase Migrations

Migrations create the database tables needed for the application.

### 2.1 Check Migration Status

```bash
supabase db remote list
```

### 2.2 Apply All Migrations

```bash
supabase db push
```

This will apply all migrations in `supabase/migrations/`:
- `001_create_daily_words_table.sql` - For Daily Wordle
- `002_create_shared_crosswords_table.sql` - For sharing crosswords
- `003_create_marketplace_crosswords_table.sql` - For marketplace

### 2.3 Verify Migrations

1. Go to Supabase Dashboard > Table Editor
2. Verify these tables exist:
   - `daily_words`
   - `shared_crosswords`
   - `marketplace_crosswords`

## Step 3: Deploy Supabase Edge Functions

Edge Functions are serverless functions that run on Supabase infrastructure.

### 3.1 Deploy the Daily Word Function

```bash
supabase functions deploy get-daily-word
```

### 3.2 Verify Function Deployment

1. Go to Supabase Dashboard > Edge Functions
2. You should see `get-daily-word` listed
3. Test it by calling it from your frontend or using the Supabase dashboard

### 3.3 (Optional) Set Function Secrets

If you need to add environment variables to functions:

```bash
supabase secrets set SECRET_NAME=secret_value --project-ref YOUR_PROJECT_REF
```

## Step 4: Configure Environment Variables

### 4.1 Local Development

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: 
- Use `VITE_` prefix (not `REACT_APP_`)
- No spaces around `=`
- Restart dev server after creating/updating `.env`

### 4.2 GitHub Pages Deployment

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** and add:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://YOUR_PROJECT_REF.supabase.co`
4. Click **New repository secret** again and add:
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Your anon key from Supabase

## Step 5: Deploy Frontend to GitHub Pages

### 5.1 Enable GitHub Pages

1. Go to your GitHub repository
2. Navigate to **Settings** > **Pages**
3. Under **Source**, select:
   - **Branch**: `main` (or `gh-pages`)
   - **Folder**: `/ (root)`
4. Click **Save**

### 5.2 Configure GitHub Actions

The workflow file (`.github/workflows/deploy.yml`) is already set up. It will:
- Build the React app on every push to `main`
- Deploy to GitHub Pages automatically

### 5.3 Push to GitHub

```bash
git add .
git commit -m "Deploy application"
git push origin main
```

### 5.4 Monitor Deployment

1. Go to **Actions** tab in your GitHub repository
2. Watch the deployment workflow run
3. Once complete, your site will be available at:
   `https://YOUR_USERNAME.github.io/CrosswordCreator/`

## Step 6: Update Base URL (if needed)

If your GitHub Pages URL is different, update `vite.config.js`:

```javascript
export default defineConfig({
  base: '/YourRepoName/',
  // ... rest of config
})
```

## Step 7: Verify Deployment

### 7.1 Test Daily Wordle
- Navigate to Daily Wordle page
- Should fetch a word from Supabase Edge Function

### 7.2 Test Sharing
- Create a crossword
- Click "Share" button
- Verify share link works

### 7.3 Test Marketplace
- Upload a crossword to marketplace
- Browse marketplace
- Download a crossword

## Troubleshooting

### Migrations Fail

```bash
# Check current migration status
supabase db remote list

# Reset and reapply (WARNING: This will drop tables)
supabase db reset --linked
supabase db push
```

### Edge Function Not Working

1. Check function logs:
   ```bash
   supabase functions logs get-daily-word
   ```

2. Verify function is deployed:
   ```bash
   supabase functions list
   ```

3. Test function locally:
   ```bash
   supabase functions serve get-daily-word
   ```

### Frontend Build Fails

1. Check environment variables are set correctly
2. Verify `.env` file exists (for local) or GitHub Secrets (for deployment)
3. Check build logs in GitHub Actions

### CORS Errors

- Edge Functions should already have CORS headers
- If issues persist, check Supabase Dashboard > Edge Functions > Settings

### Database Connection Issues

1. Verify Supabase URL and anon key are correct
2. Check Supabase project is active (not paused)
3. Verify RLS (Row Level Security) policies if needed

## Quick Deployment Checklist

- [ ] Supabase project created
- [ ] Supabase CLI installed and logged in
- [ ] Project linked: `supabase link --project-ref YOUR_REF`
- [ ] Migrations applied: `supabase db push`
- [ ] Edge Function deployed: `supabase functions deploy get-daily-word`
- [ ] Environment variables set in `.env` (local) and GitHub Secrets (deployment)
- [ ] GitHub Pages enabled
- [ ] Code pushed to GitHub
- [ ] Deployment verified

## Updating After Changes

### Update Migrations

1. Create new migration file in `supabase/migrations/`
2. Apply: `supabase db push`

### Update Edge Functions

1. Make changes to function code
2. Deploy: `supabase functions deploy FUNCTION_NAME`

### Update Frontend

1. Make changes to code
2. Commit and push to GitHub
3. GitHub Actions will automatically rebuild and deploy

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
