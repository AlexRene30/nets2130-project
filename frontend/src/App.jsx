import React, { useState, useEffect } from 'react';
import './App.css';

/**
 * Frontend prototype illustrating Kinnect workflows.
 * Uses fetch against the in-memory Express server; could be replaced with mocked data.
 */
const API_BASE = 'http://localhost:4000';

const defaultActivity = { type: 'run', distanceKm: 5, durationMinutes: 30 };

function ActivityForm({ user, onLogged }) {
  const [activity, setActivity] = useState(defaultActivity);

  const updateField = (field, value) => setActivity((prev) => ({ ...prev, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API_BASE}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, ...activity }),
    });
    const payload = await response.json();
    onLogged(payload);
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>Log Activity</h3>
      <label>
        Type
        <select value={activity.type} onChange={(e) => updateField('type', e.target.value)}>
          <option value="run">Run</option>
          <option value="walk">Walk</option>
          <option value="workout">Workout</option>
        </select>
      </label>
      {activity.type !== 'workout' && (
        <label>
          Distance (km)
          <input
            type="number"
            min="0"
            value={activity.distanceKm}
            onChange={(e) => updateField('distanceKm', Number(e.target.value))}
          />
        </label>
      )}
      {activity.type === 'workout' && (
        <label>
          Duration (minutes)
          <input
            type="number"
            min="0"
            value={activity.durationMinutes}
            onChange={(e) => updateField('durationMinutes', Number(e.target.value))}
          />
        </label>
      )}
      <button type="submit">Add Activity</button>
    </form>
  );
}

function Leaderboard({ data }) {
  return (
    <div className="card">
      <h3>Leaderboards</h3>
      <section>
        <h4>Teams</h4>
        <ul>
          {data.teamLeaderboard.map((team) => (
            <li key={team.id}>
              #{team.rank} {team.name} — {team.totalPoints} pts / {team.totalActivities} activities
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Cities</h4>
        <ul>
          {data.cityLeaderboard.map((city) => (
            <li key={city.city}>
              {city.city}: {city.points} pts (Top streak: {city.streak})
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Individuals</h4>
        <ul>
          {data.individualLeaderboard.map((user) => (
            <li key={user.username}>
              #{user.rank} {user.username}: {user.points} pts — streak {user.streak}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ActivityMap({ mapPoints }) {
  // Convert lat/lng to map coordinates (simple equirectangular projection)
  const latLngToMapCoords = (lat, lng) => {
    // Latitude: -90 to 90 maps to 0% to 100% (inverted because map starts at top)
    // Longitude: -180 to 180 maps to 0% to 100%
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x, y };
  };

  return (
    <div className="card map-card">
      <h3>Live Activity Map</h3>
      <p className="small">Mock heatmap of today's global contributions.</p>
      <div className="map">
        {mapPoints.map((point) => {
          const coords = latLngToMapCoords(point.lat, point.lng);
          return (
            <div 
              key={point.id} 
              className="map-dot" 
              style={{ 
                left: `${coords.x}%`, 
                top: `${coords.y}%` 
              }}
            >
              <span>{point.username}</span>
              <small>{point.type} · {point.intensity} pts</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StreaksAndBadges({ user }) {
  // Define badge milestones
  const streakBadges = [
    { days: 3, name: 'Getting Started', icon: '🔥' },
    { days: 7, name: 'Week Warrior', icon: '💪' },
    { days: 14, name: 'Two Week Champion', icon: '⭐' },
    { days: 30, name: 'Monthly Master', icon: '🏆' },
    { days: 60, name: 'Dedication Deity', icon: '👑' },
    { days: 100, name: 'Century Streak', icon: '💯' },
  ];

  const pointBadges = [
    { points: 100, name: 'First Hundred', icon: '🎯' },
    { points: 500, name: 'Point Collector', icon: '📊' },
    { points: 1000, name: 'Grand Master', icon: '🌟' },
    { points: 2500, name: 'Elite Achiever', icon: '💎' },
    { points: 5000, name: 'Legendary', icon: '⚡' },
  ];

  // Calculate earned badges
  const earnedStreakBadges = streakBadges.filter((badge) => user.streak >= badge.days);
  const earnedPointBadges = pointBadges.filter((badge) => user.points >= badge.points);

  // Find next milestone
  const nextStreakBadge = streakBadges.find((badge) => user.streak < badge.days);
  const nextPointBadge = pointBadges.find((badge) => user.points < badge.points);

  return (
    <div className="card">
      <h3>Streaks & Badges</h3>
      
      {/* Current Streak Display */}
      <div className="streak-display">
        <div className="streak-number">{user.streak || 0}</div>
        <div className="streak-label">Day Streak 🔥</div>
        {nextStreakBadge && (
          <div className="streak-progress">
            <small>
              {nextStreakBadge.days - user.streak} more day{nextStreakBadge.days - user.streak !== 1 ? 's' : ''} until {nextStreakBadge.name} {nextStreakBadge.icon}
            </small>
          </div>
        )}
      </div>

      {/* Streak Badges */}
      <section className="badges-section">
        <h4>Streak Badges</h4>
        <div className="badges-grid">
          {streakBadges.map((badge) => {
            const earned = user.streak >= badge.days;
            return (
              <div key={badge.days} className={`badge ${earned ? 'earned' : 'locked'}`}>
                <div className="badge-icon">{badge.icon}</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-requirement">{badge.days} days</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Point Badges */}
      <section className="badges-section">
        <h4>Point Badges</h4>
        <div className="badges-grid">
          {pointBadges.map((badge) => {
            const earned = user.points >= badge.points;
            return (
              <div key={badge.points} className={`badge ${earned ? 'earned' : 'locked'}`}>
                <div className="badge-icon">{badge.icon}</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-requirement">{badge.points} pts</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Login({ onAuth }) {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('pass123');

  const authenticate = async (path) => {
    const response = await fetch(`${API_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, city: 'New York', teamName: 'NYC Hustlers' }),
    });
    const payload = await response.json();
    if (payload.user) {
      onAuth(payload.user);
    } else {
      alert(payload.error || 'Something went wrong');
    }
  };

  return (
    <div className="card">
      <h3>Kinnect Login</h3>
      <label>
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <div className="button-row">
        <button onClick={() => authenticate('login')}>Login</button>
        <button onClick={() => authenticate('signup')}>Sign Up</button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState({ teamLeaderboard: [], cityLeaderboard: [], individualLeaderboard: [] });
  const [mapPoints, setMapPoints] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/leaderboard`).then((res) => res.json()).then(setLeaderboard);
    fetch(`${API_BASE}/activity-map`).then((res) => res.json()).then((data) => setMapPoints(data.mapPoints));
  }, []);

  const refreshData = () => {
    fetch(`${API_BASE}/leaderboard`).then((res) => res.json()).then(setLeaderboard);
    fetch(`${API_BASE}/activity-map`).then((res) => res.json()).then((data) => setMapPoints(data.mapPoints));
  };

  if (!user) {
    return (
      <main className="layout">
        <Login onAuth={setUser} />
      </main>
    );
  }

  const handleActivityLogged = () => {
    refreshData();
    fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, password: user.password }),
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user));
  };

  return (
    <main className="layout">
      <header>
        <h1>Kinnect Dashboard</h1>
        <p>Welcome back, {user.username}! Keep the streak alive.</p>
      </header>
      <section className="grid">
        <ActivityForm user={user} onLogged={handleActivityLogged} />
        <StreaksAndBadges user={user} />
        <Leaderboard data={leaderboard} />
        <ActivityMap mapPoints={mapPoints} />
      </section>
    </main>
  );
}