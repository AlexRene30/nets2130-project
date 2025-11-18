# Strava API OAuth Integration Guide

This guide provides complete instructions for setting up and using the Strava OAuth integration in the Kinnect app.

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Database Setup](#database-setup)
6. [Testing the Integration](#testing-the-integration)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

## Overview

The Strava integration allows users to:
- Connect their Strava accounts via OAuth 2.0
- Automatically sync activities from Strava
- View their Strava profile and activity data
- Have tokens automatically refreshed without re-authorization

### Architecture

- **Backend**: Express.js server handling OAuth flow and API proxying
- **Frontend**: React components for connection UI and activity display
- **Storage**: In-memory (prototype) or PostgreSQL (production)
- **Security**: Token encryption, CSRF protection, rate limiting

## Environment Setup

### 1. Create `.env` file in `backend/` directory

```bash
cd backend
touch .env
```

### 2. Add your Strava credentials

```env
# Strava API Credentials
STRAVA_CLIENT_ID=186057
STRAVA_CLIENT_SECRET=your_client_secret_here
STRAVA_REDIRECT_URI=http://localhost:5173/api/strava/callback

# Server Configuration
PORT=4000

# Encryption Key (generate a random 32-byte hex string)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here
```

### 3. Generate Encryption Key

Run this command to generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `ENCRYPTION_KEY` in your `.env` file.

### 4. Configure Strava App Settings

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Set **Authorization Callback Domain** to: `localhost`
3. **Important**: The callback URL must point to your **backend server** (port 4000), not the frontend, because the backend needs to exchange the authorization code for tokens.
   - Correct: `http://localhost:4000/api/strava/callback`
   - The callback endpoint is handled by the backend, which then redirects to the frontend
4. Ensure your app has the required scopes:
   - `read` - Basic profile data
   - `activity:read_all` - Read all activities (including private)

## Backend Implementation

### Dependencies

All required dependencies are already installed:
- `dotenv` - Environment variable management
- `axios` - HTTP client for Strava API
- `express-rate-limit` - Rate limiting
- `crypto` - Built-in Node.js module for encryption

### Key Files

1. **`backend/server.js`** - Main server with OAuth endpoints
2. **`backend/strava-utils.js`** - Utility functions for OAuth and API calls

### OAuth Flow

1. User clicks "Connect with Strava"
2. Frontend calls `GET /api/strava/auth?username=USERNAME`
3. Backend generates state parameter and returns authorization URL
4. User is redirected to Strava authorization page
5. User authorizes the app
6. Strava redirects to `GET /api/strava/callback?code=CODE&state=STATE`
7. Backend exchanges code for tokens
8. Tokens are encrypted and stored
9. User is redirected back to frontend with success/error

### Token Management

- **Access Tokens**: Expire after 6 hours, automatically refreshed
- **Refresh Tokens**: Used to get new access tokens
- **Storage**: Encrypted using AES-256-GCM
- **Auto-refresh**: Tokens are refreshed automatically before API calls if expired

## Frontend Implementation

### Components

1. **`StravaConnection.jsx`** - Connection status and connect/disconnect button
2. **`StravaActivities.jsx`** - List of user's Strava activities

### Integration Points

The components are already integrated into `App.jsx`. The OAuth callback is handled automatically via URL parameters.

## Database Setup

### For Production (PostgreSQL)

Run the migration file:

```bash
psql -U your_user -d your_database -f backend/migrations/001_create_strava_connections.sql
```

### Migration File

Located at: `backend/migrations/001_create_strava_connections.sql`

The schema includes:
- `user_id` - Links to user account
- `strava_athlete_id` - Strava athlete ID
- `access_token_encrypted` - Encrypted access token
- `refresh_token_encrypted` - Encrypted refresh token
- `expires_at` - Token expiration timestamp
- `scope` - OAuth scopes granted
- Indexes for performance

### Current Implementation (In-Memory)

The current implementation uses in-memory storage for the prototype. To migrate to a database:

1. Replace `stravaConnections` object with database queries
2. Update `getValidAccessToken()` to query database
3. Update all endpoints to use database instead of in-memory object

## Testing the Integration

### 1. Start the Backend

```bash
cd backend
npm start
```

You should see: `Kinnect prototype backend listening on port 4000`

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

### 3. Test OAuth Flow

1. Login to the app (use `alice` / `pass123`)
2. Click "Connect with Strava" button
3. You'll be redirected to Strava authorization page
4. Authorize the app
5. You'll be redirected back to the app
6. You should see your Strava profile and activities

### 4. Test Token Refresh

Tokens automatically refresh when expired. To test manually:

```bash
curl -X POST http://localhost:4000/api/strava/refresh \
  -H "Content-Type: application/json" \
  -d '{"username": "alice"}'
```

## Security Best Practices

### ✅ Implemented

1. **Token Encryption**: All tokens encrypted using AES-256-GCM
2. **CSRF Protection**: State parameter validation
3. **Rate Limiting**: 200 requests per 15 minutes per IP
4. **Environment Variables**: Secrets stored in `.env` (not committed)
5. **Token Expiration**: Automatic refresh with 5-minute buffer

### 🔒 Additional Recommendations

1. **Use HTTPS in Production**: Never use HTTP for OAuth callbacks
2. **Key Management**: Use a key management service (AWS KMS, HashiCorp Vault) in production
3. **Database Encryption**: Encrypt database at rest
4. **Session Management**: Use secure, httpOnly cookies for sessions
5. **Audit Logging**: Log all OAuth events for security monitoring
6. **Token Rotation**: Implement token rotation policies
7. **Scope Validation**: Validate scopes before granting access

### Where to Store Client Secret?

**✅ Current**: Environment variable (`.env` file)
- Good for development
- **Never commit `.env` to git**

**🔒 Production Options**:
1. **AWS Secrets Manager** - Best for AWS deployments
2. **HashiCorp Vault** - Best for on-premise or multi-cloud
3. **Environment Variables** - OK for containerized deployments (Docker, Kubernetes)
4. **CI/CD Secrets** - For automated deployments

### How to Encrypt Tokens?

**Current Implementation**: AES-256-GCM encryption using Node.js `crypto` module

**Production Recommendations**:
1. Use a dedicated encryption service
2. Rotate encryption keys periodically
3. Use different keys for different environments
4. Implement key versioning

### Authentication State Management

**Current**: Username-based (for prototype)

**Production Recommendations**:
1. **JWT Tokens**: For stateless authentication
2. **Session Cookies**: For stateful authentication
3. **OAuth 2.0 for Users**: Implement full OAuth for your own users

## Troubleshooting

### Common Issues

#### 1. "Invalid state parameter"

**Cause**: State expired or already used
**Solution**: Try connecting again (state is single-use)

#### 2. "Token refresh failed"

**Cause**: Refresh token invalid or user revoked access
**Solution**: User needs to reconnect their Strava account

#### 3. "UNAUTHORIZED" errors

**Cause**: Access token expired and refresh failed
**Solution**: Check if user revoked access on Strava's side

#### 4. Rate limit exceeded

**Cause**: Too many API requests
**Solution**: Implement caching or wait for rate limit window to reset

#### 5. CORS errors

**Cause**: Frontend and backend on different origins
**Solution**: Ensure CORS is properly configured in `server.js`

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=true
```

## API Reference

### Backend Endpoints

#### `GET /api/strava/auth`
Generate Strava authorization URL

**Query Parameters**:
- `username` (required) - User's username

**Response**:
```json
{
  "authUrl": "https://www.strava.com/oauth/authorize?...",
  "state": "random_state_string"
}
```

#### `GET /api/strava/callback`
Handle OAuth callback from Strava

**Query Parameters**:
- `code` - Authorization code from Strava
- `state` - State parameter for CSRF protection
- `error` - Error message if authorization failed

**Response**: Redirects to frontend

#### `GET /api/strava/status`
Get connection status

**Query Parameters**:
- `username` (required)

**Response**:
```json
{
  "connected": true,
  "stravaAthleteId": 123456,
  "expiresAt": 1234567890000,
  "isExpired": false,
  "scope": "read,activity:read_all"
}
```

#### `POST /api/strava/refresh`
Manually refresh tokens

**Body**:
```json
{
  "username": "alice"
}
```

#### `GET /api/strava/disconnect`
Remove Strava connection

**Query Parameters**:
- `username` (required)

#### `GET /api/strava/athlete`
Get athlete profile

**Query Parameters**:
- `username` (required)

**Response**: Strava athlete object

#### `GET /api/strava/activities`
Get user's activities

**Query Parameters**:
- `username` (required)
- `per_page` (optional, default: 30) - Number of activities per page
- `page` (optional, default: 1) - Page number

**Response**: Array of Strava activity objects

## Handling Revoked Access

When a user revokes access from Strava's side:

1. Next API call will return 401 Unauthorized
2. Backend automatically removes the connection
3. Frontend should prompt user to reconnect
4. User can reconnect via "Connect with Strava" button

## Concurrent Token Refresh

The current implementation handles concurrent refresh requests:

- First request triggers refresh
- Subsequent requests wait for refresh to complete
- All requests use the new token

For production, consider:
- Using a mutex/lock mechanism
- Caching refresh operations
- Implementing request queuing

## Additional Features (Optional)

### Webhook Integration

To receive real-time activity updates:

1. Set up webhook endpoint: `POST /api/strava/webhook`
2. Register webhook with Strava API
3. Handle `activity.create` and `activity.update` events
4. Sync activities automatically

### Caching Strategies

Reduce API calls by:
- Caching athlete profile (5 minutes)
- Caching activities list (1 minute)
- Using ETags for conditional requests

### Background Jobs

For syncing activities:
- Use a job queue (Bull, Agenda.js)
- Sync activities every 15 minutes
- Handle rate limits gracefully

## Success Criteria Checklist

✅ Users can click "Connect with Strava" button
✅ Users are redirected to Strava authorization
✅ Users are redirected back after authorization
✅ Strava profile information is displayed
✅ Recent activities are displayed
✅ Tokens automatically refresh without re-authorization
✅ Users can disconnect their Strava account
✅ Error handling for all failure cases
✅ Security measures in place (encryption, CSRF, rate limiting)

## Next Steps

1. **Add your Client Secret** to `.env` file
2. **Generate encryption key** and add to `.env`
3. **Test the OAuth flow** end-to-end
4. **Set up database** (if moving to production)
5. **Implement webhooks** (optional, for real-time sync)
6. **Add activity syncing** to automatically import activities into Kinnect

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Strava API documentation: https://developers.strava.com/docs
3. Check server logs for detailed error messages

