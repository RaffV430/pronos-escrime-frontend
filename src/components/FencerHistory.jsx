import { eventNameFr } from '../lib/eventName';
import { useEffect, useRef, useState } from 'react';
import API from '../api';
import ResultsPools from './ResultsPools';
export default function FencerHistory({ favorite, onClose }) {
  const panel = useRef(null);
  const [data, setData] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    setError('');
    panel.current?.scrollIntoView({ block: 'start' });
    const controller = new AbortController();
    API.get(`/me/fencers/${favorite.id}/history`, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch(() => {
        if (!controller.signal.aborted) setError('Historique indisponible. Réessayez avec une connexion.');
      });
    return () => controller.abort();
  }, [favorite.id]);
  return (
    <section ref={panel} className="fencer-history" aria-label={`Parcours de ${favorite.name}`}>
      <header>
        <h3>{favorite.name} · Parcours</h3>
        <button onClick={onClose}>Fermer</button>
      </header>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Recherche de la dernière compétition…</p>}
      {data?.event && (
        <>
          <p>
            <strong>
              {data.event.tournament.name} · {eventNameFr(data.event.name)}
            </strong>
          </p>
          <p>
            {data.rank
              ? `Classement officiel : ${data.rank.rank}${data.rank.rank === 1 ? 'er' : 'e'}${data.rank.tied ? ' ex æquo' : ''}`
              : 'Classement officiel en attente'}
          </p>
          <h4>Poules</h4>
          <ResultsPools poolsOverride={data.pools} />
          <h4>Tableau</h4>
          {data.matches.length ? (
            <ul>
              {data.matches.map((m) => (
                <li key={m.id}>
                  <strong>{m.round}</strong> · {m.player1} / {m.player2} ·{' '}
                  {m.isFinished ? `${m.score1 ?? '—'}–${m.score2 ?? '—'}` : 'Résultat en attente'}
                  {m.isFinished && [1, 2].includes(m.winner) ? ` · Vainqueur : ${m[`player${m.winner}`]}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucun match du tableau publié.</p>
          )}
          {data.event.resultsSourceUrl && (
            <a href={data.event.resultsSourceUrl} target="_blank" rel="noreferrer">
              Classement officiel ↗
            </a>
          )}
        </>
      )}
      {data && !data.event && <p>Aucune compétition disputée et identifiée sans ambiguïté pour ce favori.</p>}
    </section>
  );
}
