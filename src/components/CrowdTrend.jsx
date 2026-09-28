import { plural } from './resultPresentation';

// Répartition des pronostics des joueurs, affichée une fois le match clos.
export default function CrowdTrend({ match }) {
  const c = match.crowd;
  if (!c?.total) return null;
  const top = c.topScore;
  return (
    <div className="crowd-trend" aria-label="Pronostics des joueurs">
      <div className="crowd-labels">
        <span>
          <strong>{c.player1Pct} %</strong> {match.player1}
        </span>
        <span>
          {match.player2} <strong>{c.player2Pct} %</strong>
        </span>
      </div>
      <div
        className="crowd-bar"
        role="img"
        aria-label={`${c.player1Pct} % des joueurs voient ${match.player1} gagner, ${c.player2Pct} % ${match.player2}`}
      >
        <span style={{ width: `${c.player1Pct}%` }} />
      </div>
      {c.outsider && (
        <p className="crowd-outsider">Victoire d’outsider : +1 point bonus pour ceux qui l’avaient vue venir.</p>
      )}
      <small>
        {c.total} {plural(c.total, 'pronostic')}
        {top && ` · score le plus joué : ${top.score1} – ${top.score2} (${top.count})`}
      </small>
    </div>
  );
}
