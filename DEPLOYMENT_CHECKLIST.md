# Vercel Deployment Checklist

## Pre-Deployment

- [x] Pulled latest changes from git
- [x] Created `vercel.json` configuration
- [x] Created `api/server.js` for Vercel serverless functions
- [x] Updated all frontend files to use environment-based API URLs
- [x] Created API configuration utility (`frontend/src/config/api.js`)
- [x] Updated Vite configuration for production builds
- [x] Created `.vercelignore` file

## Files Created/Modified

### New Files:
- `vercel.json` - Vercel deployment configuration
- `api/server.js` - Serverless function wrapper for Express backend
- `frontend/src/config/api.js` - Centralized API configuration
- `frontend/vercel.json` - Frontend-specific Vercel config
- `.vercelignore` - Files to exclude from deployment
- `VERCEL_DEPLOYMENT.md` - Complete deployment guide
- `DEPLOYMENT_CHECKLIST.md` - This file

### Modified Files:
- `frontend/src/App.jsx` - Uses API config
- `frontend/src/pages/*.jsx` - All pages use API config
- `frontend/src/components/*.jsx` - All components use API config
- `frontend/vite.config.js` - Added build configuration

## Deployment Steps

1. **Push to Git:**
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to vercel.com
   - Import your repository
   - Configure build settings (see VERCEL_DEPLOYMENT.md)
   - Add environment variables

3. **Environment Variables to Set:**
   - `VITE_API_BASE` = `https://your-project.vercel.app`
   - `STRAVA_CLIENT_ID` = `186057`
   - `STRAVA_CLIENT_SECRET` = (your secret)
   - `STRAVA_REDIRECT_URI` = `https://your-project.vercel.app/api/strava/callback`
   - `ENCRYPTION_KEY` = (your 64-char hex key)
   - `SUPABASE_URL` = (your Supabase URL)
   - `SUPABASE_SERVICE_ROLE_KEY` = (your Supabase key)

4. **Update Strava Settings:**
   - Update callback URL to: `https://your-project.vercel.app/api/strava/callback`

5. **Test Deployment:**
   - Visit deployed URL
   - Test authentication
   - Test API endpoints
   - Test Strava integration

## Continuous Deployment

Once set up, every push to `main` branch will automatically deploy!

## Troubleshooting

If deployment fails:
1. Check Vercel build logs
2. Verify all environment variables are set
3. Ensure Node.js version is compatible (18+)
4. Check that all dependencies are in package.json files

