import { useState } from 'react';
import { recentMatchDetails, chronologicalRecentMatches } from '../lib/recentMatchDetails';
import { roundLabel } from './matchPresentation';
export default function RecentMatches({ name, rows = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const displayedRows = chronologicalRecentMatches(rows);
  const selected = rows.find((row) => row.matchId === selectedId);
  const details = selected && recentMatchDetails(selected);
  if (!rows.length) return null;
  return (
    <section className="h2h-recent" aria-label={`Derniers matchs de tableau connus de ${name}`}>
      <h4>Forme · {name}</h4>
      {rows.length > 0 && (
        <>
          <div className="h2h-recent-buttons" role="group" aria-label={`Résultats de ${name}`}>
            {displayedRows.map((row, index) => {
              const d = recentMatchDetails(row);
              return (
                <button
                  type="button"
                  key={row.matchId}
                  className={`h2h-result-button ${row.won ? 'won' : 'lost'}`}
                  aria-pressed={selectedId === row.matchId}
                  aria-label={`${index === displayedRows.length - 1 ? 'Le plus récent. ' : ''}${d.outcome} contre ${d.opponent}, ${d.score}. Afficher le détail.`}
                  onClick={() => setSelectedId(selectedId === row.matchId ? null : row.matchId)}
                >
                  <span aria-hidden="true">{row.won ? 'V' : 'D'}</span>
                </button>
              );
            })}
          </div>
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
