# Supabase Setup Checklist

Follow these steps to complete your Supabase setup:

## ✅ Step 1: Deploy Database Migrations

Run these migrations to create all necessary tables:

```bash
# Make sure you're logged in and linked
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all migrations
supabase db push
```

This will create:
- `daily_words` - For Daily Wordle
- `shared_crosswords` - For sharing crosswords via links
- `marketplace_crosswords` - For the marketplace

**Verify:** Go to Supabase Dashboard → Table Editor → Check that all 3 tables exist

---

## ✅ Step 2: Deploy Edge Function

Deploy the Daily Wordle function:

```bash
supabase functions deploy get-daily-word
```

**Verify:** Go to Supabase Dashboard → Edge Functions → Check that `get-daily-word` is listed

---

## ✅ Step 3: Enable Google OAuth (Required for Marketplace)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted:
   - User Type: External
   - App name: Crossword Creator (or your choice)
   - Support email: Your email
   - Authorized domains: Leave empty for now
6. Create OAuth Client:
   - Application type: **Web application**
   - Name: Crossword Creator
   - **Authorized redirect URIs**: Add this:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     Replace `YOUR_PROJECT_REF` with your actual Supabase project reference
7. Copy the **Client ID** and **Client Secret**

8. In Supabase Dashboard:
   - Go to **Authentication** → **Providers**
   - Find **Google** and click to enable
   - Paste your **Client ID** and **Client Secret**
   - Click **Save**

**Verify:** Try signing in with Google on your app - it should work!

---

## ✅ Step 4: Set Up Environment Variables

### For Local Development

Make sure your `.env` file in the root directory has:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get these values from:** Supabase Dashboard → Settings → API

### For GitHub Pages (Production)

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key

---

## ✅ Step 5: Test Everything

### Test Daily Wordle:
1. Start dev server: `npm run dev`
2. Navigate to `/daily-wordle`
3. Should fetch a word from Supabase

### Test Authentication:
1. Go to Home page or Marketplace
2. Click "Sign in with Google"
3. Should redirect to Google, then back to your app
4. Should see your profile info when signed in

### Test Marketplace:
1. Sign in with Google
2. Create a crossword
3. Click "Upload" button on a crossword card
4. Fill in details and upload
5. Go to Marketplace page
6. Should see your uploaded crossword
7. Try downloading a crossword (should work when signed in)

### Test Sharing:
1. Create a crossword
2. Click "Share" button
3. Should generate a shareable link
4. Copy the link and test it in an incognito window

---

## 🔧 Troubleshooting

### "Supabase client not configured"
- Check your `.env` file exists in the root directory
- Verify variables start with `VITE_` (not `REACT_APP_`)
- Restart your dev server after changing `.env`

### "Table not found" errors
- Run `supabase db push` to apply migrations
- Check Supabase Dashboard → Table Editor to verify tables exist

### Google OAuth not working
- Verify redirect URI matches exactly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Check Client ID and Secret are correct in Supabase
- Make sure Google+ API is enabled in Google Cloud Console

### Edge Function errors
- Check Supabase Dashboard → Edge Functions → Logs
- Verify function is deployed: `supabase functions list`

---

## 📝 Quick Reference

**Supabase Dashboard:** https://app.supabase.com  
**Google Cloud Console:** https://console.cloud.google.com/  
**Project Reference:** Found in your Supabase URL (`https://YOUR_PROJECT_REF.supabase.co`)

---

## ✅ Completion Checklist

- [ ] Database migrations deployed (`supabase db push`)
- [ ] All 3 tables exist in Supabase Dashboard
- [ ] Edge Function deployed (`supabase functions deploy get-daily-word`)
- [ ] Google OAuth configured in Supabase
- [ ] Environment variables set in `.env` file
- [ ] Environment variables set in GitHub Secrets (for production)
- [ ] Daily Wordle works
- [ ] Google sign-in works
- [ ] Marketplace upload works
- [ ] Marketplace download works
- [ ] Sharing works

Once all items are checked, your Supabase setup is complete! 🎉

