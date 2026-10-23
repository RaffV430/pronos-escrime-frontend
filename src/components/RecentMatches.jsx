import { useState } from 'react';
import { recentMatchDetails } from '../lib/recentMatchDetails';
import { roundLabel } from './matchPresentation';
export default function RecentMatches({ name, rows = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = rows.find((row) => row.matchId === selectedId);
  const details = selected && recentMatchDetails(selected);
  return (
    <section className="h2h-recent" aria-label={`Derniers matchs de tableau connus de ${name}`}>
      <h4>Derniers matchs de tableau connus · {name}</h4>
      <p className="muted">
        {rows.length ? 'Du plus récent au plus ancien → · Touchez une pastille.' : 'Aucun résultat de tableau connu.'}
      </p>
      {rows.length > 0 && (
        <>
          <div className="h2h-recent-buttons" role="group" aria-label={`Résultats de ${name}`}>
            {rows.map((row, index) => {
              const d = recentMatchDetails(row);
              return (
                <button
                  type="button"
                  key={row.matchId}
                  className="h2h-result-button"
                  aria-pressed={selectedId === row.matchId}
                  aria-label={`${index === 0 ? 'Le plus récent. ' : ''}${d.outcome} contre ${d.opponent}, ${d.score}. Afficher le détail.`}
                  onClick={() => setSelectedId(selectedId === row.matchId ? null : row.matchId)}
                >
                  <span className={`h2h-pill ${row.won ? 'won' : 'lost'}`} aria-hidden="true">
                    {row.won ? 'V' : 'D'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="muted h2h-recent-hint">
            V = victoire · D = défaite. Jusqu’à 5 résultats issus des épreuves suivies par l’app, hors poules.
            Historique partiel ; les retraits et forfaits peuvent être inclus.
          </p>
        </>
      )}
      {details && (
        <div className="h2h-recent-detail" role="status">
          <strong>
            {details.outcome} contre {details.opponent}
          </strong>
          <p>
            {details.score}
            {!selected.medical && Array.isArray(selected.score) && selected.score.every(Number.isFinite)
              ? ` · score de ${name} en premier`
              : ''}
          </p>
          <p>
            {details.date}
            {selected.round ? ` · ${roundLabel(selected.round)}` : ''}
          </p>
          <p>{details.context}</p>
        </div>
      )}
    </section>
  );
}
