import { useEffect, useState } from 'react';
import API from '../api';

// Maquette navigation 2 : classement des clubs rangé dans « Classements » (et plus dans Délégations).
export default function ClubRanking({ preferred = null }) {
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(preferred ? String(preferred) : '');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    API.get('/tournaments', { signal: c.signal })
      .then(({ data }) => {
        setTournaments(data);
        setSelected((s) => s || (data[0] ? String(data[0].id) : ''));
      })
      .catch(() => setError('Liste des tournois indisponible.'));
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!selected) return undefined;
    const c = new AbortController();
    setRows(null);
    API.get(`/community/clubs/${selected}`, { signal: c.signal })
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => !c.signal.aborted && setError('Classement des clubs indisponible.'));
    return () => c.abort();
  }, [selected]);
  const points = (v) => Number(v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return (
    <section className="feature-panel nav2-clubs" aria-labelledby="nav2-clubs-title">
      <h1 id="nav2-clubs-title">Classement des clubs</h1>
      <label>
        Tournoi
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.archivedAt ? ' (terminé)' : ''}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {rows === null && !error && <p className="muted">Chargement…</p>}
      {rows && !rows.length && <p>Aucun club éligible pour ce tournoi.</p>}
      {rows && rows.length > 0 && (
        <ol className="nav2-club-list">
          {rows.map((r) => (
            <li key={r.id ?? r.leagueId ?? r.name}>
              <span className="nav2-club-rank">{r.rank}</span>
              <strong>{r.name}</strong>
              <small>{r.members ? `${r.members} membres` : ''}</small>
              <span className="nav2-club-points">{points(r.totalPoints)} pts</span>
            </li>
          ))}
        </ol>
      )}
      <p className="muted">Calcul : moyenne des points des membres du club sur le tournoi choisi.</p>
    </section>
  );
}
