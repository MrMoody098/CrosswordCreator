# Fix Google OAuth Redirect URI Error

## Error: `redirect_uri_mismatch`

This error means the redirect URI in Google Cloud Console doesn't match what Supabase is sending.

## Solution

### Step 1: Find Your Supabase Project Reference

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Look at your **Project URL** - it will be something like:
   ```
   https://vpmmcdwcxatfhyysiamg.supabase.co
   ```
   The part after `https://` and before `.supabase.co` is your **Project Reference**

### Step 2: Configure Redirect URI in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID and click **Edit** (pencil icon)
5. Under **Authorized redirect URIs**, add **BOTH** of these:

   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   http://localhost:54321/auth/v1/callback
   ```

   **Important:** Replace `YOUR_PROJECT_REF` with your actual project reference from Step 1.

   Example (if your project ref is `vpmmcdwcxatfhyysiamg`):
   ```
   https://vpmmcdwcxatfhyysiamg.supabase.co/auth/v1/callback
   http://localhost:54321/auth/v1/callback
   ```

6. Click **Save**

### Step 3: Verify in Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Google**
3. Make sure:
   - Google is **Enabled**
   - **Client ID (for OAuth)** is filled in
   - **Client Secret (for OAuth)** is filled in
4. Click **Save** if you made any changes

### Step 4: Test Again

1. Clear your browser cache or use an incognito window
2. Try signing in with Google again
3. It should work now!

## Common Issues

### Issue: "Still getting redirect_uri_mismatch"

**Solution:** 
- Make sure you added the redirect URI with `https://` (not `http://`) for production
- Make sure there are no trailing slashes: `/auth/v1/callback` not `/auth/v1/callback/`
- Wait a few minutes after saving - Google sometimes takes time to propagate changes
- Try in an incognito window to avoid cached redirects

### Issue: "Can't find OAuth credentials in Google Cloud Console"

**Solution:**
1. Make sure you're in the correct Google Cloud project
2. Go to **APIs & Services** → **Credentials**
3. If you don't see OAuth 2.0 Client IDs, click **+ CREATE CREDENTIALS** → **OAuth client ID**
4. Configure the consent screen first if prompted

### Issue: "Works locally but not in production"

**Solution:**
- Make sure you added the production redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- The localhost URI is only for local development with Supabase CLI

## Quick Checklist

- [ ] Found my Supabase Project Reference
- [ ] Added redirect URI to Google Cloud Console: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] Added localhost redirect URI: `http://localhost:54321/auth/v1/callback`
- [ ] Saved changes in Google Cloud Console
- [ ] Verified Google OAuth is enabled in Supabase Dashboard
- [ ] Cleared browser cache / tried incognito
- [ ] Tested sign-in again

## Still Having Issues?

1. **Check the exact error in browser console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for the exact redirect URI being used

2. **Verify Supabase redirect URI:**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Check what redirect URLs are configured

3. **Double-check Google Cloud Console:**
   - Make sure you're editing the correct OAuth client
   - Verify the redirect URI matches exactly (case-sensitive, no trailing slashes)

