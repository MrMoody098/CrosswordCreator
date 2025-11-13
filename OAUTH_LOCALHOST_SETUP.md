# Google OAuth with Localhost vs Production

## Short Answer

**No, you don't need to deploy to production for it to work!** You can test Google OAuth on localhost, but you need to configure it correctly.

## How It Works

Supabase handles the OAuth flow like this:

1. User clicks "Sign in with Google" on your app (localhost or production)
2. User is redirected to Google for authentication
3. Google redirects back to **Supabase's auth endpoint**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Supabase processes the auth, then redirects back to **your app** (wherever it's running)

## Configuration Needed

### 1. Google Cloud Console - Redirect URI

**This is the same for localhost AND production:**

Add this redirect URI in Google Cloud Console:
```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

**Important:** This is Supabase's callback URL, not your localhost URL. It works for both localhost and production because Supabase handles the redirect.

### 2. Supabase Dashboard - Site URL

You need to configure where Supabase should redirect users AFTER authentication:

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** to:
   - For localhost: `http://localhost:5173` (or whatever port your dev server uses)
   - For production: Your production URL (e.g., `https://yourusername.github.io/CrosswordCreator`)

4. Add **Redirect URLs** (both localhost and production):
   - `http://localhost:5173/**` (for local development)
   - `https://yourusername.github.io/CrosswordCreator/**` (for production)
   - The `/**` allows any path on your site

### 3. Your App Code

The Auth component already handles this correctly:
```javascript
redirectTo: window.location.origin + (import.meta.env.BASE_URL || '/')
```

This automatically uses:
- `http://localhost:5173/` when running locally
- Your production URL when deployed

## Setup Steps for Localhost

### Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add redirect URI:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
5. **Save**

### Step 2: Configure Supabase Dashboard

1. Go to Supabase Dashboard
2. **Authentication** → **URL Configuration**
3. Set **Site URL**: `http://localhost:5173` (or your dev server port)
4. Add **Redirect URLs**:
   - `http://localhost:5173/**`
   - `http://localhost:5173`
5. **Save**

### Step 3: Test Locally

1. Start your dev server: `npm run dev`
2. Navigate to your app (usually `http://localhost:5173`)
3. Click "Sign in with Google"
4. Should work! ✅

## Common Issues

### Issue: "redirect_uri_mismatch" even after adding Supabase URL

**Solution:**
- Make sure you added: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Check for typos in your project reference
- Wait a few minutes after saving (Google can take time to update)

### Issue: "Redirect URL mismatch" from Supabase

**Solution:**
- Check Supabase Dashboard → Authentication → URL Configuration
- Make sure your localhost URL is in the **Redirect URLs** list
- Format: `http://localhost:5173/**` (with the `/**` wildcard)

### Issue: Works on localhost but not production (or vice versa)

**Solution:**
- Add both URLs to Supabase Redirect URLs:
  - `http://localhost:5173/**` (localhost)
  - `https://your-production-url.com/**` (production)
- Update Site URL when switching between environments

## Quick Checklist

- [ ] Added Supabase callback URL to Google Cloud Console: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] Set Site URL in Supabase Dashboard to your localhost URL
- [ ] Added localhost to Redirect URLs in Supabase: `http://localhost:5173/**`
- [ ] Tested sign-in on localhost
- [ ] (For production) Added production URL to Redirect URLs

## Summary

- **Google Cloud Console**: Only needs Supabase's callback URL (works for both localhost and production)
- **Supabase Dashboard**: Needs your app URLs (localhost for dev, production for live)
- **Your App**: Works on both localhost and production with the same code

You can develop and test everything locally! 🎉

