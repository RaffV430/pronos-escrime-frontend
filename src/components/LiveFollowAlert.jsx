// Alerte « votre tireur monte en piste » : dès qu'un tireur suivi apparaît sur une piste en direct de
// l'épreuve choisie, une alerte s'affiche une seule fois par rencontre (pour la session du navigateur).
// En ligne, le même signal pourra déclencher une notification sur le téléphone.
import { useEffect, useState } from 'react';
import { isFollowedFencer, useFencerFollows } from '../lib/fencerFollows';
import { useLiveScores } from '../lib/useLiveScores';
import './live-score.css';

const KEY = 'pronos:live-alerts';
const seen = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
};
const remember = (ids) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* alerte simplement rejouable */
  }
};

export default function LiveFollowAlert({ competitionId, onOpen }) {
  const follows = useFencerFollows();
  const following = Boolean(follows?.ready && follows.matchNames?.length);
  const live = useLiveScores(competitionId, following);
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    if (!following) return;
    const done = seen();
    const fresh = [...live.values()]
      .filter((x) => !x.finished && !done.has(x.matchId))
      .map((x) => ({
        ...x,
        fencer: [x.fencer1, x.fencer2].find((f) => isFollowedFencer(follows, f?.name)),
        opponent: [x.fencer1, x.fencer2].find((f) => !isFollowedFencer(follows, f?.name)),
      }))
      .filter((x) => x.fencer);
    if (!fresh.length) return;
    fresh.forEach((x) => done.add(x.matchId));
    remember(done);
    setAlerts((old) => [...old, ...fresh].slice(-3));
  }, [live, follows, following]);
  if (!alerts.length) return null;
  const close = (id) => setAlerts((old) => old.filter((a) => a.matchId !== id));
  return (
    <div className="live-follow-alerts" role="status" aria-live="polite">
      {alerts.map((a) => (
        <div className="live-follow-alert" key={a.matchId}>
          <span className="live-score-dot" aria-hidden="true" />
          <p>
            <strong>{a.fencer.name}</strong> monte en piste {a.strip}
            {a.opponent?.name ? ` face à ${a.opponent.name}` : ''}.
          </p>
          <button
            type="button"
            onClick={() => {
              close(a.matchId);
              onOpen?.(a.matchId);
            }}
          >
            Suivre
          </button>
          <button type="button" className="button-link" aria-label="Fermer l’alerte" onClick={() => close(a.matchId)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
