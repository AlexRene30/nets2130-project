# Strava Integration Quick Start

Get up and running with Strava OAuth integration in 5 minutes!

## Prerequisites

- Node.js installed
- Strava API credentials (Client ID: 186057, Client Secret from Strava)
- Backend and frontend dependencies installed

## Step 1: Set Up Environment Variables

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create `.env` file (copy from example if available):
   ```bash
   # Create .env file with these contents:
   ```

3. Add your credentials to `.env`:
   ```env
   STRAVA_CLIENT_ID=186057
   STRAVA_CLIENT_SECRET=your_actual_secret_here
   STRAVA_REDIRECT_URI=http://localhost:4000/api/strava/callback
   PORT=4000
   ENCRYPTION_KEY=generate_with_command_below
   ```

4. Generate encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste as `ENCRYPTION_KEY` in `.env`

## Step 2: Start Backend Server

```bash
cd backend
npm start
```

You should see: `Kinnect prototype backend listening on port 4000`

## Step 3: Start Frontend (in a new terminal)

```bash
cd frontend
npm run dev
```

## Step 4: Test the Integration

1. Open browser to `http://localhost:5173`
2. Login with `alice` / `pass123`
3. Click "Connect with Strava" button
4. Authorize the app on Strava
5. You'll be redirected back and see your Strava profile and activities!

## Troubleshooting

### "Invalid credentials" error
- Check that your `STRAVA_CLIENT_SECRET` is correct in `.env`
- Make sure `.env` file is in the `backend/` directory

### "Cannot find module" errors
- Run `npm install` in both `backend/` and `frontend/` directories

### CORS errors
- Ensure backend is running on port 4000
- Ensure frontend is running on port 5173 (or update `STRAVA_REDIRECT_URI`)

### Token errors
- Check that `ENCRYPTION_KEY` is a valid 64-character hex string
- Regenerate if needed

## Next Steps

- Read the full [Integration Guide](./STRAVA_INTEGRATION_GUIDE.md)
- Set up database for production (see migration file)
- Implement webhooks for real-time sync (optional)

## Need Help?

Check the [STRAVA_INTEGRATION_GUIDE.md](./STRAVA_INTEGRATION_GUIDE.md) for detailed documentation.

