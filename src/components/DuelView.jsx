import { roundLabel } from './matchPresentation';
import { plural } from './resultPresentation';

// Duel avec un autre joueur (groupe, club ou Classements), sur ce qui est terminé uniquement.
export default function DuelView({ duel, onClose }) {
  const { totals, rows, opponent } = duel;
  return (
    <div className="feature-panel duel">
      <div className="feature-heading">
        <h3>Duel · vous contre {opponent?.name}</h3>
        <button className="button-secondary" onClick={onClose}>
          Fermer
        </button>
      </div>
      <div className="duel-score" aria-label="Score du duel">
        <div>
          <strong>{totals.me}</strong>
          <small>vous</small>
        </div>
        <span aria-hidden="true">–</span>
        <div>
          <strong>{totals.them}</strong>
          <small>{opponent?.name}</small>
        </div>
      </div>
      <p className="muted">
        {totals.won} {plural(totals.won, 'gagné', 'gagnés')} · {totals.lost} {plural(totals.lost, 'perdu')} ·{' '}
        {totals.drawn} à égalité. Matchs, poules et podiums : seuls ceux qui sont terminés sont comparés.
      </p>
      {!rows.length && <p>Rien de terminé pronostiqué par l’un de vous deux pour l’instant.</p>}
      <ul className="duel-rows">
        {rows.map((r) => (
          <li
            key={`${r.kind || 'match'}-${r.matchId || r.poolId || r.competitionId}`}
            className={`duel-row duel-${r.winner}`}
          >
            <div className="duel-match">
              <strong>{r.name}</strong>
              <small>
                {r.competition}
                {r.round && ` · ${roundLabel(r.round)}`}
                {r.kind && r.kind !== 'match' ? ` · ${r.result}` : ` · Résultat ${r.result}`}
              </small>
            </div>
            <div>
              <small>Vous</small>
              <span>{r.me ? `${r.me.prediction} · ${r.me.points} ${plural(r.me.points, 'pt', 'pts')}` : '—'}</span>
            </div>
            <div>
              <small>{opponent?.name}</small>
              <span>
                {r.them ? `${r.them.prediction} · ${r.them.points} ${plural(r.them.points, 'pt', 'pts')}` : '—'}
              </span>
            </div>
            <span className="duel-verdict">
              {r.winner === 'me' ? 'Vous' : r.winner === 'them' ? opponent?.name : 'Égalité'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
