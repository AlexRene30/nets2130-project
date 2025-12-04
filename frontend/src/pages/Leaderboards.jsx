import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/api';

export default function Leaderboards({ user }) {
  const [boards, setBoards] = useState({ teamLeaderboard: [], cityLeaderboard: [], individualLeaderboard: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        setBoards(data || {});
      })
      .catch((err) => console.error('Error loading leaderboards', err))
      .finally(() => setLoading(false));
  }, []);

  const topTeam = boards.teamLeaderboard[0];
  const topCity = boards.cityLeaderboard[0];
  const topIndividual = boards.individualLeaderboard[0];

  return (
    <div className="dashboard-container">
      <section className="hero-section">
        <h2 className="hero-welcome">Leaderboards</h2>
        <p className="small">Check out who's leading among teams, cities and individuals — celebrate top performers and discover rising stars.</p>
      </section>

      {/* Top highlights as three equal hero cards */}
      <div className="leaderboards-hero">
        <div className="leader-hero-grid">
          <div className="leader-hero-card leader-team">
            <h3>Top Team</h3>
            {topTeam ? (
              <div className="leader-entity-hero">
                <div className="hero-rank">#{topTeam.rank}</div>
                <div className="hero-info">
                  <div className="hero-name">{topTeam.name}</div>
                  <div className="hero-meta">{topTeam.totalPoints} pts • {topTeam.totalActivities} activities</div>
                </div>
              </div>
            ) : <div className="small">No teams yet.</div>}
          </div>

          <div className="leader-hero-card leader-city">
            <h3>Top City</h3>
            {topCity ? (
              <div className="leader-entity-hero">
                <div className="hero-rank">1</div>
                <div className="hero-info">
                  <div className="hero-name">{topCity.city}</div>
                  <div className="hero-meta">{topCity.points} pts • streak {topCity.streak}</div>
                </div>
              </div>
            ) : <div className="small">No city data.</div>}
          </div>

          <div className="leader-hero-card leader-individual">
            <h3>Top Individual</h3>
            {topIndividual ? (
              <div className="leader-entity-hero">
                <div className="hero-rank">1</div>
                <div className="hero-info">
                  <div className="hero-name">{topIndividual.username}</div>
                  <div className="hero-meta">{topIndividual.points} pts • streak {topIndividual.streak}</div>
                </div>
              </div>
            ) : <div className="small">No individuals yet.</div>}
          </div>
        </div>
      </div>

      <div className="leaderboard-grid">
        <div className="leaderboard-column">
          <div className="card">
            <h3>Teams</h3>
            <ol className="leader-list">
              {boards.teamLeaderboard.map((t) => (
                <li key={t.id} className={`leader-row ${t.rank === 1 ? 'gold' : t.rank === 2 ? 'silver' : t.rank === 3 ? 'bronze' : ''}`}>
                  <div className="rank">#{t.rank}</div>
                  <div className="info">
                    <div className="name">{t.name}</div>
                    <div className="meta">{t.totalPoints} pts • {t.totalActivities} activities</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="leaderboard-column">
          <div className="card">
            <h3>Cities</h3>
            <ol className="leader-list">
              {boards.cityLeaderboard.map((c, idx) => (
                <li key={c.city || idx} className={`leader-row ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                  <div className="rank">#{idx + 1}</div>
                  <div className="info">
                    <div className="name">{c.city}</div>
                    <div className="meta">{c.points} pts • top streak {c.streak}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="leaderboard-column">
          <div className="card">
            <h3>Individuals</h3>
            <ol className="leader-list">
              {boards.individualLeaderboard.map((u) => (
                <li key={u.username} className={`leader-row ${u.rank === 1 ? 'gold' : u.rank === 2 ? 'silver' : u.rank === 3 ? 'bronze' : ''}`}>
                  <div className="rank">#{u.rank}</div>
                  <div className="info">
                    <div className="name">{u.username}</div>
                    <div className="meta">{u.points} pts • streak {u.streak}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {loading && <div className="small">Loading leaderboards...</div>}
    </div>
  );
}
