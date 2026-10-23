// Scores vus du côté du tireur, tels que reçus du serveur ; aucune déduction de points.
export function recentMatchDetails(row) {
  const outcome = row.won ? 'Victoire' : 'Défaite';
  const score = row.medical
    ? 'Retrait / forfait — score non affiché'
    : Array.isArray(row.score) && row.score.length === 2 && row.score.every(Number.isFinite)
      ? `${row.score[0]}–${row.score[1]}`
      : 'Score non renseigné';
  const date =
    row.date && Number.isFinite(Date.parse(row.date))
      ? new Date(row.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Date non renseignée';
  return {
    outcome,
    score,
    date,
    opponent: row.opponent || 'Adversaire non renseigné',
    context: [row.tournament, row.competition].filter(Boolean).join(' · ') || 'Épreuve non renseignée',
  };
}
