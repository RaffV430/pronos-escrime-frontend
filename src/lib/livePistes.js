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
