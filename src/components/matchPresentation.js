export function isMatchClosed(match, now) {
  if (match.isFinished) return true;
  if (match.manualUnlockUntil) return now >= Date.parse(match.manualUnlockUntil);
  return Boolean(match.timingUnverified || match.isLocked || (!match.awaitingPreviousRound && match.closesAt && now >= Date.parse(match.closesAt)));
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

// Positions come from official slots, never from the filtered display order.
export function bracketLayout(groups) {
  const size = round => /^T(\d+)$/.test(round) ? Number(round.slice(1)) : /^(final|finale)$/i.test(round) ? 2 : /^(semi-finals|demi-finales)$/i.test(round) ? 4 : null;
  const base = Math.max(2, ...groups.map(g=>size(g.round)||0));
  return groups.map(group=>{
    const count=size(group.round), factor=base/count;
    const positions=group.items.map(m=>Number(m.sourceKey?.match(/:(\d+)$/)?.[1]));
    const aligned=!!count && Number.isInteger(Math.log2(count)) && Number.isInteger(factor) && positions.every(n=>Number.isInteger(n)&&n>0&&n<=count/2) && new Set(positions).size===positions.length;
    return {...group, rows:base, aligned, slots:group.items.map((match,i)=>({match,start:aligned?(positions[i]-1)*factor*2+1:null,span:aligned?factor*2:null}))};
  });
}

export function entryRank(entries, name) {
 const normalize=value=>String(value||'').normalize('NFC').trim().replace(/\s+/g,' ').toUpperCase();
 const found=entries.filter(e=>normalize(e.name)===normalize(name));
 return found.length===1&&Number.isSafeInteger(found[0].entryRanking)&&found[0].entryRanking>0?found[0].entryRanking:null;
}
