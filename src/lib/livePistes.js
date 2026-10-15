import { ftlPresentation } from './pisteLive.js';
// Seules les rencontres associées par le serveur à l’épreuve sélectionnée sont montrées.
export const PISTE_FRESH_MS = 3 * 60000;
export function livePistes(matches, live, now) {
  return matches
    .filter((m) => !m.isFinished && m.resultType !== 'CANCELLED')
    .flatMap((m) => {
      const score = live.get(m.id);
      if (
        !score ||
        score.finished ||
        !Number.isFinite(Date.parse(score.updatedAt)) ||
        now - Date.parse(score.updatedAt) > PISTE_FRESH_MS
      )
        return [];
      return [ftlPresentation(m, score)];
    });
}

export function livePredictionLabel(match, live, userId) {
  const p = match.predictions?.find((p) => p.userId === userId);
  if (!p) return 'Votre prono : non renseigné';
  if (p.winnerOnly)
    return `Votre prono : ${p.predictedScore1 > p.predictedScore2 ? match.player1 : match.player2} vainqueur`;
  const scores =
    live?.ftlLeftPlayer === 2 ? [p.predictedScore2, p.predictedScore1] : [p.predictedScore1, p.predictedScore2];
  return `Votre prono : ${scores[0]} – ${scores[1]}`;
}
