import { useEffect, useRef, useState } from 'react';
import API from '../api';

const readSelection = key => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Number.isSafeInteger(value?.tournamentId) && value.tournamentId > 0 && Number.isSafeInteger(value?.eventId) && value.eventId > 0 ? value : null;
  } catch { return null; }
};

export default function EventSelector({ userId, onSelect, onReset }) {
  const storageKey = 'pronos:last-event:' + userId;
  const pendingRestore = useRef(readSelection(storageKey));
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  const remember = (selection) => {
    try { localStorage.setItem(storageKey, JSON.stringify(selection)); } catch { /* Navigation still works when storage is unavailable. */ }
  };
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
        const saved = pendingRestore.current;
        if (tournamentId) {
          setEvents(data);
          if (saved && String(saved.tournamentId) === tournamentId) {
            pendingRestore.current = null;
            if (data.some(event => Number(event.id) === saved.eventId)) {
              setEventId(String(saved.eventId));
              setConfirmed(true);
              onSelectRef.current(saved.tournamentId, saved.eventId);
            } else {
              try { localStorage.removeItem(storageKey); } catch { /* Optional preference. */ }
            }
          }
        } else {
          setTournaments(data);
          if (saved) {
            if (data.some(t => Number(t.id) === saved.tournamentId)) setTournamentId(String(saved.tournamentId));
            else {
              pendingRestore.current = null;
              try { localStorage.removeItem(storageKey); } catch { /* Optional preference. */ }
            }
          }
        }
      }
    }).catch(() => {
      if (!controller.signal.aborted) setError('Impossible de charger les compétitions. Réessayez.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tournamentId, retry, storageKey]);

  function reset() { pendingRestore.current = null; setConfirmed(false); onReset(); }
  const field = { display: 'grid', gap: '8px', flex: '1 1 240px' };
  const select = { width: '100%' };
  return <section aria-labelledby="event-choice" style={{ background: '#f2f6fb', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
    <h2 id="event-choice" style={{ marginTop: 0 }}>Choisissez vos pronostics</h2>
    <p>Sélectionnez une compétition, puis l’épreuve sur laquelle vous souhaitez pronostiquer.</p>
    <form onSubmit={e => { e.preventDefault(); if (tournamentId && eventId && !loading && !error) { remember({ tournamentId: Number(tournamentId), eventId: Number(eventId) }); onSelect(Number(tournamentId), Number(eventId)); setConfirmed(true); } }}>
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
      {!confirmed && <button type="submit" disabled={!eventId || loading || !!error} style={{ marginTop: '16px' }}>Accéder aux pronostics</button>}
    </form>
  </section>;
}
