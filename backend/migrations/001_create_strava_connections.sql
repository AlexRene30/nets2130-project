-- Migration: Create strava_connections table
-- Run this migration to set up the database schema for Strava OAuth token storage

CREATE TABLE IF NOT EXISTS strava_connections (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- References username in users table
    strava_athlete_id BIGINT UNIQUE NOT NULL,
    access_token_encrypted TEXT NOT NULL, -- Encrypted access token
    refresh_token_encrypted TEXT NOT NULL, -- Encrypted refresh token
    expires_at BIGINT NOT NULL, -- Unix timestamp in milliseconds
    scope TEXT, -- OAuth scopes granted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraint (adjust based on your users table structure)
    -- CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_strava_connections_user_id ON strava_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_connections_athlete_id ON strava_connections(strava_athlete_id);
CREATE INDEX IF NOT EXISTS idx_strava_connections_expires_at ON strava_connections(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_strava_connections_updated_at 
    BEFORE UPDATE ON strava_connections 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

