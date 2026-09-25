import { useEffect, useState } from 'react';
import API from '../api';

export default function EventSelector({ onSelect, onReset }) {
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [tournamentId, setTournamentId] = useState('');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const url = tournamentId ? `/podium/competitions/${tournamentId}` : '/tournaments';
    API.get(url, { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Invalid list');
      if (!controller.signal.aborted) {
        if (tournamentId) setEvents(data);
        else setTournaments(data);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setError('Impossible de charger les compétitions. Réessayez.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tournamentId, retry]);

  function reset() { setConfirmed(false); onReset(); }
  const field = { display: 'grid', gap: '8px', flex: '1 1 240px', fontWeight: 'bold' };
  const select = { padding: '12px', borderRadius: '6px', border: '1px solid #bbc7d4', width: '100%', fontSize: '1rem' };
  return <section aria-labelledby="event-choice" style={{ background: '#f2f6fb', border: '1px solid #cbd9e8', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
    <h2 id="event-choice" style={{ marginTop: 0 }}>Choisissez vos pronostics</h2>
    <p>Sélectionnez une compétition, puis l’épreuve sur laquelle vous souhaitez pronostiquer.</p>
    <form onSubmit={e => { e.preventDefault(); if (tournamentId && eventId && !loading && !error) { onSelect(Number(tournamentId), Number(eventId)); setConfirmed(true); } }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        <label style={field}>Compétition<select style={select} required value={tournamentId} disabled={loading && !tournamentId} onChange={e => { reset(); setTournamentId(e.target.value); setEventId(''); setEvents([]); }}>
          <option value="">Choisir une compétition</option>
          {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select></label>
        <label style={field}>Épreuve<select style={select} required value={eventId} disabled={!tournamentId || loading || !!error} onChange={e => { reset(); setEventId(e.target.value); }}>
          <option value="">Choisir une épreuve</option>
          {events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}
        </select></label>
      </div>
      {loading && <p role="status">Chargement…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Réessayer</button></p>}
      {!loading && !error && !tournaments.length && <p>Aucune compétition disponible pour le moment.</p>}
      {!loading && !error && tournamentId && !events.length && <p>Aucune épreuve disponible pour cette compétition.</p>}
      {!confirmed && <button type="submit" disabled={!eventId || loading || !!error} style={{ marginTop: '16px', padding: '12px 18px', border: 0, borderRadius: '6px', background: !eventId || loading || error ? '#d3dae3' : '#1763ae', color: !eventId || loading || error ? '#475569' : 'white', fontWeight: 'bold' }}>Accéder aux pronostics</button>}
    </form>
  </section>;
}
