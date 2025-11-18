# Environment Variables Setup

## Quick Setup

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Add your Strava Client Secret**:
   - Open `.env` file
   - Replace `your_client_secret_here` with your actual Strava Client Secret

3. **Generate Encryption Key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - Copy the output
   - Replace `your_32_byte_hex_encryption_key_here` in `.env` with the generated key

4. **Verify your settings**:
   - `STRAVA_CLIENT_ID` should be `186057`
   - `STRAVA_REDIRECT_URI` should point to your **backend** server (default: `http://localhost:4000/api/strava/callback`)
     - **Important**: The callback must go to the backend, not frontend, because the backend exchanges the authorization code for tokens
   - `PORT` should match your backend port (default: `4000`)

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `STRAVA_CLIENT_ID` | Your Strava app Client ID | `186057` |
| `STRAVA_CLIENT_SECRET` | Your Strava app Client Secret | `abc123...` |
| `STRAVA_REDIRECT_URI` | OAuth callback URL (must be backend) | `http://localhost:4000/api/strava/callback` |
| `PORT` | Backend server port | `4000` |
| `ENCRYPTION_KEY` | 32-byte hex key for token encryption | `a1b2c3d4...` (64 characters) |

## Security Notes

⚠️ **Never commit `.env` file to git!**

The `.env` file contains sensitive credentials and should be:
- Added to `.gitignore`
- Never shared publicly
- Different for each environment (dev, staging, production)

## Production Setup

For production, use a secrets management service:
- AWS Secrets Manager
- HashiCorp Vault
- Environment variables in your hosting platform
- CI/CD pipeline secrets

