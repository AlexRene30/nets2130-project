// Strava OAuth utility functions
const crypto = require('crypto');
const axios = require('axios');

// Simple encryption/decryption using AES-256-GCM
// In production, use a proper key management system
function encrypt(text, key) {
  if (!text) return null;
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData, key) {
  if (!encryptedData || !encryptedData.encrypted) return null;
  try {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(key, 'hex'),
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Generate state parameter for CSRF protection
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code, clientId, clientSecret) {
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code'
    });
    
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: response.data.expires_at * 1000, // Convert to milliseconds
      athlete: response.data.athlete,
      scope: response.data.scope || ''
    };
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

// Refresh access token
async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token, // Strava provides new refresh token
      expiresAt: response.data.expires_at * 1000,
      scope: response.data.scope || ''
    };
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}

// Check if token is expired (with 5 minute buffer)
function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  return Date.now() >= (expiresAt - 5 * 60 * 1000); // 5 minute buffer
}

// Make authenticated Strava API request
async function stravaApiRequest(endpoint, accessToken, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `https://www.strava.com/api/v3${endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('UNAUTHORIZED'); // Token expired or invalid
    }
    throw error;
  }
}

module.exports = {
  encrypt,
  decrypt,
  generateState,
  exchangeCodeForTokens,
  refreshAccessToken,
  isTokenExpired,
  stravaApiRequest
};

