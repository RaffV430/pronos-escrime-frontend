import { useEffect, useState } from 'react';
import API from '../api';
import { plural } from './resultPresentation';
import { roundLabel } from './matchPresentation';

const ordinal = (n) => (n === 1 ? '1er' : `${n}e`);

// Récap de fin d'épreuve : rang, points par phase, meilleur pronostic, image à partager.
export default function EventRecap({ competitionId, playerName = '', revision = 0 }) {
  const [recap, setRecap] = useState(null);
  const [state, setState] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    API.get(`/me/recap/${competitionId}`, { signal: controller.signal })
      .then(({ data }) => !controller.signal.aborted && setRecap(data))
      .catch(() => {});
    return () => controller.abort();
  }, [competitionId, revision]);
  if (!recap?.finished || !recap.predictions) return null;
  const share = async () => {
    setState('busy');
    try {
      const { shareCard } = await import('../lib/shareCard.js');
      const done = await shareCard(
        {
          tournamentName: [recap.tournamentName, recap.competition.name].filter(Boolean).join(' · '),
          ranking: { rank: recap.rank, totalPoints: recap.points },
          players: recap.players,
          winners: recap.winners,
          played: recap.played,
          exact: recap.exact,
        },
        playerName,
      );
      setState(done === 'downloaded' ? 'Image téléchargée.' : '');
    } catch {
      setState('Partage impossible. Réessayez.');
    }
  };
  return (
    <aside className="event-recap" aria-label="Récap de l’épreuve">
      <p className="eyebrow">Épreuve terminée · votre récap</p>
      <div className="event-recap-head">
        <p>
          <strong>{recap.rank ? ordinal(recap.rank) : '—'}</strong>
          <span> sur {recap.players}</span>
        </p>
        <p>
          <strong>{recap.points}</strong>
          <span> {plural(recap.points, 'point')}</span>
        </p>
        <p>
          <strong>{recap.exact}</strong>
          <span> {plural(recap.exact, 'score exact', 'scores exacts')}</span>
        </p>
      </div>
      {recap.phases.length > 0 && (
        <ul className="event-recap-phases">
          {recap.phases.map((p) => (
            <li key={p.phase}>
              <span>{p.phase === 'Poules' || p.phase === 'Podium' ? p.phase : roundLabel(p.phase)}</span>
              <strong>
                {p.points} {plural(p.points, 'pt')}
              </strong>
            </li>
          ))}
        </ul>
      )}
      {recap.best && (
        <p className="event-recap-best">
          Meilleur pronostic : <strong>{recap.best.name}</strong>
          {recap.best.round ? ` (${roundLabel(recap.best.round)})` : ''} · {recap.best.prediction} → {recap.best.result}{' '}
          · <strong>+{recap.best.points}</strong>
        </p>
      )}
      <p>
        <button type="button" className="button-secondary" onClick={share} disabled={state === 'busy'}>
          {state === 'busy' ? '…' : 'Partager mon résultat'}
        </button>{' '}
        {state && state !== 'busy' && <small role="status">{state}</small>}
      </p>
    </aside>
  );
}
