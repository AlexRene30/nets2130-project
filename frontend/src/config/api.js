// API configuration for environment-based URLs
// In development: uses localhost
// In production: uses Vercel deployment URL
export const API_BASE = import.meta.env.VITE_API_BASE || 
  (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);

