import { useState } from 'react';
import API from '../api';
import { roundLabel } from './matchPresentation';

const shortDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
const scoreText = (r) => (r.medical ? 'retrait méd.' : r.score ? `${r.score[0]}–${r.score[1]}` : '');
// Score du vainqueur en premier : « KOROM Erik 15–13 ».
const winnerFirst = (r) => (r.score && !r.won ? { ...r, score: [r.score[1], r.score[0]] } : r);

function Form({ name, rows }) {
  if (!rows.length) return null;
  return (
    <p className="h2h-form">
      <span>Forme · {name}</span>{' '}
      {rows.map((r) => (
        <span
          key={r.matchId}
          className={`h2h-pill ${r.won ? 'won' : 'lost'}`}
          title={`${r.won ? 'Victoire' : 'Défaite'} ${scoreText(r)} contre ${r.opponent}${r.tournament ? ` · ${r.tournament}` : ''}`}
        >
          {r.won ? 'V' : 'D'}
        </span>
      ))}
    </p>
  );
}

// Face-à-face et forme récente, chargés à l'ouverture (épreuves déjà suivies par l'application).
export default function HeadToHead({ matchId, player1, player2 }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = (e) => {
    if (!e.currentTarget.open || data) return;
    API.get(`/matches/${matchId}/h2h`)
      .then(({ data }) => setData(data))
      .catch(() => setError('Face-à-face indisponible.'));
  };
  if (!player1?.trim() || !player2?.trim()) return null;
  return (
    <details className="h2h" onToggle={load}>
      <summary>Face-à-face et forme</summary>
      {!data && !error && <p className="muted">Chargement…</p>}
      {error && <p className="muted">{error}</p>}
      {data && (
        <>
          {data.meetings.length ? (
            <>
              <p className="h2h-summary">
                <strong>{data.summary.wins1}</strong> – <strong>{data.summary.wins2}</strong> en {data.meetings.length}{' '}
                rencontre{data.meetings.length > 1 ? 's' : ''} connue
                {data.meetings.length > 1 ? 's' : ''}
              </p>
              <ul className="h2h-list">
                {data.meetings.map((m) => (
                  <li key={m.matchId}>
                    <strong>{m.won ? player1 : player2}</strong> {scoreText(winnerFirst(m))}
                    <small>
                      {' '}
                      · {[shortDate(m.date), m.tournament, m.round && roundLabel(m.round)].filter(Boolean).join(' · ')}
                    </small>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Aucune rencontre entre eux dans les épreuves suivies.</p>
          )}
          <Form name={player1} rows={data.form.player1 || []} />
          <Form name={player2} rows={data.form.player2 || []} />
        </>
      )}
    </details>
  );
}
