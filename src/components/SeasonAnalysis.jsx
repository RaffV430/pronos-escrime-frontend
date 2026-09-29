import { roundLabel } from './matchPresentation';
import { plural } from './resultPresentation';

// Analyse personnelle de la saison : où l'on vise juste, où l'on se trompe.
export default function SeasonAnalysis({ analysis }) {
  if (!analysis || (!analysis.byRound.length && !analysis.pools.predicted)) return null;
  const { byRound, averageScoreGap, outsiderHits, pools, bestCompetition, bestRound } = analysis;
  return (
    <details className="season-analysis" open>
      <summary>Mon analyse</summary>
      {byRound.length > 0 && (
        <table className="analysis-rounds">
          <caption className="visually-hidden">Réussite par tour du tableau</caption>
          <thead>
            <tr>
              <th scope="col">Tour</th>
              <th scope="col">Vainqueur</th>
              <th scope="col">
                <abbr title="Scores exacts">Exacts</abbr>
              </th>
              <th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            {byRound.map((r) => (
              <tr key={r.round} className={r.round === bestRound ? 'is-best' : ''}>
                <th scope="row">{roundLabel(r.round)}</th>
                <td>
                  <span className="analysis-bar" aria-hidden="true">
                    <span style={{ width: `${r.accuracy ?? 0}%` }} />
                  </span>
                  {r.winners}/{r.played} · {r.accuracy}&nbsp;%
                </td>
                <td>{r.exact}</td>
                <td>{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ul className="analysis-facts">
        {bestRound && (
          <li>
            Votre meilleur tour : <strong>{roundLabel(bestRound)}</strong>
          </li>
        )}
        {averageScoreGap !== null && (
          <li>
            Écart moyen avec le score réel : <strong>{String(averageScoreGap).replace('.', ',')}</strong>{' '}
            {plural(averageScoreGap, 'touche')} par match
          </li>
        )}
        <li>
          Coups d’outsider réussis : <strong>{outsiderHits}</strong>
        </li>
        {pools.predicted > 0 && (
          <li>
            Poules : nombre de victoires exact pour <strong>{pools.winsExact}</strong>{' '}
            {plural(pools.predicted, 'tireur')} sur {pools.predicted} ({pools.winsAccuracy}&nbsp;%), indice à{' '}
            <strong>{String(pools.averageIndicatorGap).replace('.', ',')}</strong> près en moyenne
          </li>
        )}
        {bestCompetition && (
          <li>
            Meilleure épreuve : <strong>{bestCompetition.name}</strong> ({bestCompetition.points}{' '}
            {plural(bestCompetition.points, 'point')})
          </li>
        )}
      </ul>
    </details>
  );
}
