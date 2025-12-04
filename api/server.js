// Vercel serverless function wrapper for Express app
// This file routes all /api/* requests to the Express backend
const app = require('../backend/server.js');

// Export as Vercel serverless function
module.exports = (req, res) => {
  return app(req, res);
};
