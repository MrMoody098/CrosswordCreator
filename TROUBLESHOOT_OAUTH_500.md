# Troubleshooting OAuth 500 Error

## Error: `{"code":500,"error_code":"unexpected_failure","msg":"Unexpected failure, please check server logs for more information"}`

This 500 error from Supabase indicates a server-side configuration issue. Here's how to fix it:

## Step 1: Check Supabase Dashboard Logs

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Logs** → **Auth Logs**
4. Look for recent errors when you tried to sign in
5. The logs will show the exact error message

## Step 2: Verify Supabase URL Configuration

1. Go to **Authentication** → **URL Configuration**
2. **Site URL** should be set to:
   ```
   https://MrMoody098.github.io/CrosswordCreator/
   ```
   (Replace with your actual GitHub Pages URL)

3. **Redirect URLs** should include:
   ```
   https://MrMoody098.github.io/CrosswordCreator/**
   https://MrMoody098.github.io/CrosswordCreator
   http://localhost:5173/**
   http://localhost:5173
   ```

4. **Important:** Make sure there are NO trailing slashes in the Site URL (except for the wildcard pattern `/**`)

## Step 3: Verify Google OAuth Provider Configuration

1. Go to **Authentication** → **Providers** → **Google**
2. Make sure:
   - ✅ Google is **Enabled**
   - ✅ **Client ID (for OAuth)** is filled in
   - ✅ **Client Secret (for OAuth)** is filled in
   - ✅ No extra spaces or characters

3. Click **Save** even if nothing changed (this refreshes the configuration)

## Step 4: Verify Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID and click **Edit**
4. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (Replace `YOUR_PROJECT_REF` with your Supabase project reference)

5. **Important:** 
   - Must use `https://` (not `http://`)
   - No trailing slash
   - Exact match required

## Step 5: Check Environment Variables

Make sure your GitHub Pages deployment has the correct environment variables:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Verify these secrets exist:
   - `VITE_SUPABASE_URL` - Should be `https://YOUR_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## Step 6: Common Causes of 500 Errors

### Cause 1: Redirect URL Not in Allowed List
**Solution:** Make sure your GitHub Pages URL is in Supabase Redirect URLs

### Cause 2: Invalid Redirect URL Format
**Solution:** 
- Site URL should NOT have trailing slash: `https://username.github.io/CrosswordCreator/` ❌
- Site URL should be: `https://username.github.io/CrosswordCreator/` ✅ (with trailing slash is actually OK for Site URL)
- Redirect URLs should use wildcard: `https://username.github.io/CrosswordCreator/**` ✅

### Cause 3: Google OAuth Credentials Mismatch
**Solution:** 
- Verify Client ID and Secret in Supabase match Google Cloud Console
- Make sure you're using the correct Google Cloud project

### Cause 4: Supabase Project Issues
**Solution:**
- Check if your Supabase project is active (not paused)
- Try disabling and re-enabling Google OAuth provider
- Wait a few minutes after making changes

## Step 7: Test with Browser Console

1. Open your GitHub Pages site
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Try signing in with Google
5. Look for console logs showing:
   - `Attempting OAuth sign-in with redirectTo: ...`
   - Any error messages

## Step 8: Alternative: Try Without redirectTo

If the issue persists, try temporarily removing the `redirectTo` option to see if that's the issue:

```javascript
const { data, error } = await supabaseClient.auth.signInWithOAuth({
  provider: 'google',
  // Remove options temporarily to test
})
```

If this works, the issue is with the redirect URL configuration.

## Step 9: Check Supabase Status

1. Go to [Supabase Status Page](https://status.supabase.com/)
2. Check if there are any ongoing issues with Authentication service

## Quick Checklist

- [ ] Checked Supabase Auth Logs for specific error
- [ ] Verified Site URL in Supabase (no trailing slash issues)
- [ ] Added GitHub Pages URL to Redirect URLs with `/**` wildcard
- [ ] Verified Google OAuth is enabled in Supabase
- [ ] Verified Client ID and Secret are correct
- [ ] Verified Google Cloud Console redirect URI is correct
- [ ] Verified GitHub Secrets are set correctly
- [ ] Cleared browser cache / tried incognito
- [ ] Checked browser console for detailed errors
- [ ] Waited a few minutes after making changes

## Still Having Issues?

1. **Check Supabase Support:**
   - Go to Supabase Dashboard → Support
   - Create a support ticket with the error code and logs

2. **Try a Different Browser:**
   - Sometimes browser extensions can interfere
   - Try Chrome, Firefox, or Edge

3. **Check Network Tab:**
   - Open DevTools → Network tab
   - Try signing in
   - Look for failed requests to Supabase
   - Check the response body for more details

