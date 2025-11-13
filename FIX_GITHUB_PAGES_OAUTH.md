# Fix OAuth Redirect for GitHub Pages

## Problem
After clicking "Sign in with Google" on your GitHub Pages site, you're being redirected to Grafana (localhost:3000) instead of back to your application.

## Solution: Update Supabase Redirect URLs

### Step 1: Find Your GitHub Pages URL

Your GitHub Pages URL should be:
```
https://YOUR_USERNAME.github.io/CrosswordCreator/
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 2: Update Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**

### Step 3: Update Site URL

Set the **Site URL** to your GitHub Pages URL:
```
https://YOUR_USERNAME.github.io/CrosswordCreator/
```

### Step 4: Update Redirect URLs

In the **Redirect URLs** section, add these URLs (one per line):

```
https://YOUR_USERNAME.github.io/CrosswordCreator/**
https://YOUR_USERNAME.github.io/CrosswordCreator
http://localhost:5173/**
http://localhost:5173
```

**Important:**
- Replace `YOUR_USERNAME` with your actual GitHub username
- The `/**` wildcard allows any path on your site
- Keep localhost URLs for local development
- Make sure there are no trailing slashes (except for the wildcard pattern)

### Step 5: Save Changes

Click **Save** at the bottom of the page.

### Step 6: Verify Google Cloud Console

Make sure your Google Cloud Console has the correct redirect URI:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID and click **Edit**
4. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (Replace `YOUR_PROJECT_REF` with your Supabase project reference)

### Step 7: Test

1. Clear your browser cache or use an incognito window
2. Go to your GitHub Pages site
3. Try signing in with Google
4. You should be redirected back to your site (not Grafana)

## Common Issues

### Still redirecting to Grafana/localhost:3000

**Solution:**
- Double-check the Site URL in Supabase - it must match your GitHub Pages URL exactly
- Make sure you saved the changes in Supabase Dashboard
- Wait a few minutes for changes to propagate
- Clear browser cache completely

### Getting "redirect_uri_mismatch" error

**Solution:**
- Verify the redirect URI in Google Cloud Console matches: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Make sure there are no typos
- Wait a few minutes after saving

### Works locally but not on GitHub Pages

**Solution:**
- Make sure you added the GitHub Pages URL to Supabase Redirect URLs
- The Site URL should be set to your GitHub Pages URL (not localhost)
- Both URLs should be in the Redirect URLs list

## Quick Checklist

- [ ] Found my GitHub Pages URL: `https://YOUR_USERNAME.github.io/CrosswordCreator/`
- [ ] Updated Supabase Site URL to GitHub Pages URL
- [ ] Added GitHub Pages URL to Supabase Redirect URLs (with `/**` wildcard)
- [ ] Kept localhost URLs in Redirect URLs for development
- [ ] Saved changes in Supabase Dashboard
- [ ] Verified Google Cloud Console has Supabase callback URL
- [ ] Cleared browser cache / tried incognito
- [ ] Tested sign-in on GitHub Pages site

