import { useEffect, useState } from 'react';
import API from '../api';
import DuelView from './DuelView';
export default function GlobalLeaderboard({ userId, tournamentId, competitionId }) {
  const [scope, setScope] = useState('Général'),
    [selectedTournament, setTournament] = useState(tournamentId ? String(tournamentId) : ''),
    [selectedEvent, setEvent] = useState(competitionId ? String(competitionId) : ''),
    [tournaments, setTournaments] = useState([]),
    [events, setEvents] = useState([]),
    [rows, setRows] = useState(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [circuits, setCircuits] = useState([]),
    [selectedCircuit, setCircuit] = useState(''),
    [circuitInfo, setCircuitInfo] = useState(null),
    [duel, setDuel] = useState(null),
    [duelError, setDuelError] = useState('');
  // Circuits définis par l'administrateur (classements cumulés sur plusieurs tournois).
  useEffect(() => {
    const c = new AbortController();
    API.get('/community/circuits', { signal: c.signal })
      .then(({ data }) => {
        if (c.signal.aborted) return;
        const list = Array.isArray(data) ? data : [];
        setCircuits(list);
        setCircuit((old) => old || String(list[0]?.id || ''));
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    API.get('/tournaments', { signal: c.signal })
      .then(({ data }) => {
        if (c.signal.aborted) return;
        setTournaments(data);
        setTournament((old) => old || String(data[0]?.id || ''));
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    if (!selectedTournament) return () => c.abort();
    API.get(`/podium/competitions/${selectedTournament}`, { signal: c.signal })
      .then(({ data }) => {
        if (!c.signal.aborted) {
          const list = Array.isArray(data) ? data : [];
          setEvents(list);
          setEvent((old) => (list.some((e) => String(e.id) === old) ? old : String(list[0]?.id || '')));
        }
      })
      .catch(() => {});
    return () => c.abort();
  }, [selectedTournament]);
  useEffect(() => {
    const c = new AbortController();
    setRows(null);
    setError('');
    if ((scope === 'Épreuve' && !selectedEvent) || (scope === 'Tournoi' && !selectedTournament)) return () => c.abort();
    if (scope === 'Circuit') {
      if (!selectedCircuit) return () => c.abort();
      API.get(`/community/circuits/${selectedCircuit}`, { signal: c.signal })
        .then(({ data }) => {
          if (c.signal.aborted) return;
          setCircuitInfo(data.circuit);
          setRows(data.rows);
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.response?.data?.error || 'Classement indisponible. Réessayez.');
        });
      return () => c.abort();
    }
    const params =
      scope === 'Tournoi'
        ? `?tournamentId=${selectedTournament}`
        : scope === 'Épreuve'
          ? `?competitionId=${selectedEvent}`
          : '';
    API.get(`/matches/leaderboard${params}`, { signal: c.signal })
      .then(({ data }) => {
        if (!c.signal.aborted) setRows(data);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.response?.data?.error || 'Classement indisponible. Réessayez.');
      });
    return () => c.abort();
  }, [scope, selectedTournament, selectedEvent, selectedCircuit, revision]);
  // Comparaison avec un autre joueur, sur la sélection affichée (épreuve, tournoi ou toute la saison).
  const scopeParams =
    scope === 'Tournoi'
      ? { tournamentId: selectedTournament }
      : scope === 'Épreuve'
        ? { competitionId: selectedEvent }
        : {};
  useEffect(() => setDuel(null), [scope, selectedTournament, selectedEvent]);
  const compare = async (r) => {
    if (duel?.forId === r.id) return setDuel(null);
    setDuelError('');
    try {
      const { data } = await API.get(`/community/duel/${r.id}`, { params: scopeParams });
      setDuel({ forId: r.id, data });
    } catch (e) {
      setDuelError(e.response?.data?.error || 'Comparaison indisponible. Réessayez.');
    }
  };
  const me = rows?.find((r) => r.id === userId),
    previous = me ? rows.filter((r) => (r.rank || 0) < me.rank).at(-1) : null;
  return (
    <section>
      <h1 className="section-title">
        Classement{' '}
        <small>
          {scope === 'Général'
            ? 'toutes les compétitions'
            : scope === 'Tournoi'
              ? tournaments.find((t) => String(t.id) === selectedTournament)?.name
              : scope === 'Circuit'
                ? circuits.find((c) => String(c.id) === selectedCircuit)?.name
                : events.find((e) => String(e.id) === selectedEvent)?.name}
        </small>
      </h1>
      <div className="feature-heading">
        <div className="filter-row">
          {['Général', 'Tournoi', 'Épreuve', ...(circuits.length ? ['Circuit'] : [])].map((s) => (
            <button key={s} aria-pressed={scope === s} onClick={() => setScope(s)}>
              {s}
            </button>
          ))}
        </div>
        <button className="button-secondary" onClick={() => setRevision((n) => n + 1)}>
          Actualiser
        </button>
      </div>
      {scope === 'Circuit' && (
        <div className="ranking-selectors">
          <label>
            Circuit
            <select value={selectedCircuit} onChange={(e) => setCircuit(e.target.value)}>
              {circuits.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {circuitInfo && (
            <p className="muted">
              {circuitInfo.tournaments.length} tournoi{circuitInfo.tournaments.length > 1 ? 's' : ''}
              {circuitInfo.dropWorst > 0 &&
                ` · ${circuitInfo.dropWorst} plus mauvais résultat${circuitInfo.dropWorst > 1 ? 's' : ''} retiré${circuitInfo.dropWorst > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      )}
      {scope !== 'Général' && scope !== 'Circuit' && (
        <div className="ranking-selectors">
          <label>
            Tournoi
            <select
              value={selectedTournament}
              onChange={(e) => {
                setTournament(e.target.value);
                setEvent('');
              }}
            >
              {tournaments.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          {scope === 'Épreuve' && (
            <label>
              Épreuve
              <select value={selectedEvent} onChange={(e) => setEvent(e.target.value)}>
                <option value="">Choisir une épreuve</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {duelError && <p role="alert">{duelError}</p>}
      {!rows && !error && (
        <p role="status">
          {scope === 'Épreuve' && !selectedEvent ? 'Choisissez une épreuve.' : 'Chargement du classement…'}
        </p>
      )}
      {me && (
        <>
          <div className="overview">
            <div>
              <strong>{me.rank}</strong>
              <span>votre position</span>
            </div>
            <div>
              <strong>{me.totalPoints} pts</strong>
              <span>votre total</span>
            </div>
            <div>
              <strong>{previous ? `${previous.totalPoints - me.totalPoints} pts` : 'En tête'}</strong>
              <span>{previous ? 'pour rejoindre le rang précédent' : 'du classement'}</span>
            </div>
          </div>
          <button
            className="button-link"
            onClick={() =>
              document.getElementById('my-ranking')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          >
            Ma position ↓
          </button>
        </>
      )}
      <div className="real-ranking">
        {rows?.map((r, i) => (
          <article
            key={r.id}
            id={r.id === userId ? 'my-ranking' : undefined}
            className={r.id === userId ? 'my-row' : ''}
          >
            <div className="rank-main">
              <span className="rank-number">{r.rank || i + 1}</span>
              <strong>
                {r.name}
                {r.id === userId ? ' · Vous' : ''}
              </strong>
              <b>
                {r.totalPoints} <small>pts</small>
              </b>
            </div>
            <details>
              <summary>Détail des points</summary>
              {r.results && circuitInfo ? (
                <p>{circuitInfo.tournaments.map((t, k) => `${t.name} : ${r.results[k]}`).join(' · ')}</p>
              ) : (
                <p>
                  Matchs : {r.matchPoints ?? 0} · Podiums : {r.podiumPoints ?? 0} · Poules : {r.poolPoints ?? 0} · Défis
                  : {r.challengePoints ?? 0} · Ajustements : {r.adjustmentPoints ?? 0}
                </p>
              )}
            </details>
            {scope !== 'Circuit' && r.id !== userId && (
              <button
                type="button"
                className="button-link compare-button"
                aria-expanded={duel?.forId === r.id}
                onClick={() => compare(r)}
              >
                {duel?.forId === r.id ? 'Masquer la comparaison' : 'Comparer nos pronostics'}
              </button>
            )}
            {duel?.forId === r.id && <DuelView duel={duel.data} onClose={() => setDuel(null)} />}
          </article>
        ))}
      </div>
      {rows?.length === 0 && <p>Aucun point attribué pour cette sélection.</p>}
    </section>
  );
}
