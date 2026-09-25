export default function ScoringRules({ type = 'pools' }) {
  const pools = type === 'pools';
  return <details className="scoring-rules">
    <summary>Barème · jusqu’à {pools ? 8 : 4} points par {pools ? 'tireur' : 'match'}</summary>
    {pools ? <>
      <p><strong>Victoires :</strong> nombre exact = 3 pts ; écart de 1 = 1 pt ; au-delà = 0. Défaites : 0 pt.</p>
      <p><strong>Indice :</strong> exact = 5 pts ; écart de 1 à 3 = 3 pts ; de 4 à 5 = 1 pt ; au-delà = 0.</p>
      <p className="muted">Les paliers ne se cumulent pas. Les points des victoires et de l’indice s’additionnent.</p>
    </> : <>
      <p><strong>Score exact :</strong> 3 points si les deux scores sont corrects.</p>
      <p><strong>Bon vainqueur :</strong> 1 point.</p>
      <p><strong>Mauvais vainqueur ou égalité pronostiquée :</strong> 0 point.</p>
      <p className="muted">Les deux critères sont cumulables : 3 + 1 = 4 points maximum par match. Ce barème concerne les matchs, pas les pronostics de podium.</p>
    </>}
  </details>;
}
