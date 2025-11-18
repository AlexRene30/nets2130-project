// Kinnect prototype backend demonstrating core workflow
// Node.js + Express with in-memory storage for clarity

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const {
  encrypt,
  decrypt,
  generateState,
  exchangeCodeForTokens,
  refreshAccessToken,
  isTokenExpired,
  stravaApiRequest
} = require('./strava-utils');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Rate limiting for Strava API endpoints
const stravaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Store OAuth state for CSRF protection (in production, use Redis or session store)
const oauthStates = new Map();

/**********************
 * In-memory mock data
 **********************/
// Users are keyed by username for quick lookup
// Stored information includes credentials (plain text for demo only!), points, streaks, teams, and location
const users = {
  alice: {
    username: 'alice',
    password: 'pass123',
    city: 'New York',
    teamId: 'team-nyc',
    points: 120,
    streak: 3,
    lastActivityDate: '2024-05-09',
  },
};

// Teams hold aggregated totals derived from their members' activities
const teams = {
  'team-nyc': {
    id: 'team-nyc',
    name: 'NYC Hustlers',
    city: 'New York',
    totalPoints: 320,
    totalActivities: 15,
  },
};

// Activities log each action performed by a user
// In a real database we would store timestamps, metadata, etc.
const activities = [
  {
    id: 'act-1',
    username: 'alice',
    type: 'run',
    distanceKm: 5,
    durationMinutes: 30,
    pointsEarned: 50,
    date: '2024-05-09',
  },
];

// Strava connections storage (in-memory, structured for easy DB migration)
// Format: { username: { stravaAthleteId, accessTokenEncrypted, refreshTokenEncrypted, expiresAt, scope, createdAt, updatedAt } }
const stravaConnections = {};

// Encryption key (in production, use environment variable)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**********************
 * Helper functions
 **********************/
const generateId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const getToday = () => new Date().toISOString().slice(0, 10);

function calculatePoints(activity) {
  switch (activity.type) {
    case 'run':
      return activity.distanceKm * 10; // 10 pts per km
    case 'walk':
      return activity.distanceKm * 5; // 5 pts per km
    case 'workout':
      return activity.durationMinutes; // 1 pt per minute
    default:
      return 10;
  }
}

function updateUserProgress(user, activityPoints, date) {
  // Update streak: increment if last activity was yesterday, reset otherwise
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (user.lastActivityDate === date) {
    // Already logged today, streak unchanged
  } else if (user.lastActivityDate === yesterday) {
    user.streak += 1;
  } else {
    user.streak = 1;
  }
  user.lastActivityDate = date;

  user.points += activityPoints;
}

function updateTeamProgress(teamId) {
  const team = teams[teamId];
  if (!team) return;

  // Aggregate totals from member activities
  const teamMembers = Object.values(users).filter((user) => user.teamId === teamId);
  team.totalPoints = teamMembers.reduce((sum, member) => sum + member.points, 0);
  const memberUsernames = new Set(teamMembers.map((member) => member.username));
  team.totalActivities = activities.filter((activity) => memberUsernames.has(activity.username)).length;
}

function getLeaderboards() {
  const teamLeaderboard = Object.values(teams)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((team, index) => ({ rank: index + 1, ...team }));

  const cityMap = {};
  Object.values(users).forEach((user) => {
    if (!cityMap[user.city]) {
      cityMap[user.city] = { city: user.city, points: 0, streak: 0 };
    }
    cityMap[user.city].points += user.points;
    cityMap[user.city].streak = Math.max(cityMap[user.city].streak, user.streak);
  });
  const cityLeaderboard = Object.values(cityMap).sort((a, b) => b.points - a.points);

  const individualLeaderboard = Object.values(users)
    .sort((a, b) => b.points - a.points)
    .map((user, index) => ({ rank: index + 1, username: user.username, points: user.points, streak: user.streak }));

  return { teamLeaderboard, cityLeaderboard, individualLeaderboard };
}

/**********************
 * Auth endpoints (mocked)
 **********************/
app.post('/signup', (req, res) => {
  const { username, password, city, teamName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  if (users[username]) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const teamId = Object.keys(teams).find((id) => teams[id].name === teamName) || generateId('team');
  if (!teams[teamId]) {
    teams[teamId] = { id: teamId, name: teamName || 'Solo Adventurers', city: city || 'Unknown', totalPoints: 0, totalActivities: 0 };
  }

  users[username] = {
    username,
    password,
    city: city || 'Unknown',
    teamId,
    points: 0,
    streak: 0,
    lastActivityDate: null,
  };

  updateTeamProgress(teamId);

  res.json({ message: 'Signup successful', user: users[username] });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ message: 'Login successful', user });
});

/**********************
 * Activity workflow
 **********************/
app.post('/activities', (req, res) => {
  const { username, type, distanceKm = 0, durationMinutes = 0, date = getToday() } = req.body;
  const user = users[username];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const activity = {
    id: generateId('act'),
    username,
    type,
    distanceKm,
    durationMinutes,
    date,
  };
  const points = calculatePoints(activity);
  activity.pointsEarned = points;

  activities.push(activity);
  updateUserProgress(user, points, date);
  updateTeamProgress(user.teamId);

  res.json({ message: 'Activity logged', activity, user });
});

app.get('/activities/:username', (req, res) => {
  const userActivities = activities.filter((activity) => activity.username === req.params.username);
  res.json(userActivities);
});

/**********************
 * Leaderboards & dashboard
 **********************/
app.get('/leaderboard', (req, res) => {
  res.json(getLeaderboards());
});

app.get('/activity-map', (req, res) => {
  // Mocked geo data for a heatmap or activity map
  const mapPoints = activities.map((activity, index) => ({
    id: `map-${index}`,
    username: activity.username,
    lat: 40.7 + Math.random() * 0.1,
    lng: -74 + Math.random() * 0.1,
    intensity: activity.pointsEarned,
    type: activity.type,
  }));
  res.json({ mapPoints });
});

/**********************
 * Strava OAuth Integration
 **********************/

// Helper function to get valid access token (with auto-refresh)
async function getValidAccessToken(username) {
  const connection = stravaConnections[username];
  if (!connection) {
    throw new Error('No Strava connection found');
  }

  // Decrypt tokens
  const accessToken = decrypt(connection.accessTokenEncrypted, ENCRYPTION_KEY);
  const refreshToken = decrypt(connection.refreshTokenEncrypted, ENCRYPTION_KEY);

  // Check if token is expired
  if (isTokenExpired(connection.expiresAt)) {
    try {
      // Refresh the token
      const newTokens = await refreshAccessToken(
        refreshToken,
        process.env.STRAVA_CLIENT_ID,
        process.env.STRAVA_CLIENT_SECRET
      );

      // Encrypt and store new tokens
      connection.accessTokenEncrypted = encrypt(newTokens.accessToken, ENCRYPTION_KEY);
      connection.refreshTokenEncrypted = encrypt(newTokens.refreshToken, ENCRYPTION_KEY);
      connection.expiresAt = newTokens.expiresAt;
      connection.updatedAt = Date.now();

      return newTokens.accessToken;
    } catch (error) {
      // If refresh fails, remove connection
      delete stravaConnections[username];
      throw new Error('Token refresh failed. Please reconnect your Strava account.');
    }
  }

  return accessToken;
}

// GET /api/strava/auth - Generate Strava authorization URL
app.get('/api/strava/auth', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }

  if (!users[username]) {
    return res.status(404).json({ error: 'User not found' });
  }

  const state = generateState();
  oauthStates.set(state, { username, timestamp: Date.now() });

  // Clean up old states (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthStates.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      oauthStates.delete(key);
    }
  }

  // Note: Callback must go to backend, not frontend, since backend exchanges code for tokens
  const redirectUri = encodeURIComponent(process.env.STRAVA_REDIRECT_URI || 'http://localhost:4000/api/strava/callback');
  const scope = 'read,activity:read_all';
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

  res.json({ authUrl, state });
});

// GET /api/strava/callback - Handle OAuth callback
app.get('/api/strava/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`http://localhost:5173?strava_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect(`http://localhost:5173?strava_error=${encodeURIComponent('Missing authorization code or state')}`);
  }

  // Validate state to prevent CSRF
  const stateData = oauthStates.get(state);
  if (!stateData) {
    return res.redirect(`http://localhost:5173?strava_error=${encodeURIComponent('Invalid state parameter')}`);
  }

  oauthStates.delete(state); // Use state only once

  const { username } = stateData;

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(
      code,
      process.env.STRAVA_CLIENT_ID,
      process.env.STRAVA_CLIENT_SECRET
    );

    // Encrypt and store tokens
    stravaConnections[username] = {
      stravaAthleteId: tokenData.athlete.id,
      accessTokenEncrypted: encrypt(tokenData.accessToken, ENCRYPTION_KEY),
      refreshTokenEncrypted: encrypt(tokenData.refreshToken, ENCRYPTION_KEY),
      expiresAt: tokenData.expiresAt,
      scope: tokenData.scope,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    res.redirect(`http://localhost:5173?strava_success=true&username=${username}`);
  } catch (error) {
    console.error('Strava callback error:', error);
    res.redirect(`http://localhost:5173?strava_error=${encodeURIComponent(error.message)}`);
  }
});

// POST /api/strava/refresh - Manually refresh tokens
app.post('/api/strava/refresh', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }

  try {
    await getValidAccessToken(username);
    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/strava/disconnect - Remove Strava connection
app.get('/api/strava/disconnect', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }

  if (stravaConnections[username]) {
    delete stravaConnections[username];
    res.json({ message: 'Strava connection removed successfully' });
  } else {
    res.status(404).json({ error: 'No Strava connection found' });
  }
});

// GET /api/strava/status - Get connection status
app.get('/api/strava/status', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }

  const connection = stravaConnections[username];
  if (!connection) {
    return res.json({ connected: false });
  }

  res.json({
    connected: true,
    stravaAthleteId: connection.stravaAthleteId,
    expiresAt: connection.expiresAt,
    isExpired: isTokenExpired(connection.expiresAt),
    scope: connection.scope
  });
});

// GET /api/strava/athlete - Get athlete profile (with rate limiting)
app.get('/api/strava/athlete', stravaLimiter, async (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }

  try {
    const accessToken = await getValidAccessToken(username);
    const athlete = await stravaApiRequest('/athlete', accessToken);
    res.json(athlete);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Strava authorization failed. Please reconnect your account.' });
    }
    console.error('Strava API error:', error);
    res.status(500).json({ error: 'Failed to fetch athlete data' });
  }
});

// GET /api/strava/activities - Get user's activities (with rate limiting)
app.get('/api/strava/activities', stravaLimiter, async (req, res) => {
  const { username, per_page = 30, page = 1 } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'username required' });
  }

  try {
    const accessToken = await getValidAccessToken(username);
    const activities = await stravaApiRequest(
      `/athlete/activities?per_page=${per_page}&page=${page}`,
      accessToken
    );
    res.json(activities);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Strava authorization failed. Please reconnect your account.' });
    }
    console.error('Strava API error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**********************
 * Server start helper (for integration tests)
 **********************/
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Kinnect prototype backend listening on port ${PORT}`);
  });
}

module.exports = app;
