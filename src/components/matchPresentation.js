export function isMatchClosed(match, now) {
  return Boolean(match.isFinished || (!match.manualUnlock && (match.isLocked || (match.closesAt && now >= Date.parse(match.closesAt)))));
}
export function validateScores(values, maxScore = 15) {
  const scores = [values.score1, values.score2];
  if (!scores.every(v => /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) && Number(v) <= maxScore)) return `Saisissez deux scores entiers entre 0 et ${maxScore}.`;
  if (Number(scores[0]) === Number(scores[1])) return 'Un match ne peut pas se terminer à égalité.';
  return null;
}
export function groupMatches(matches) {
  const groups = new Map();
  for (const match of matches) {
    const key = match.round || 'Rencontres';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(match);
  }
  const roundOrder = value => /^T\d+$/.test(value) ? -Number(value.slice(1)) : /final/i.test(value)&&!/demi|quart/i.test(value)?0:1;
  return [...groups].sort(([a],[b]) => roundOrder(a)-roundOrder(b)).map(([round,items])=>({round,items:items.sort((a,b)=>{
    const position=m=>Number(m.sourceKey?.match(/:(\d+)$/)?.[1]||m.id);
    return position(a)-position(b);
  })}));
}
