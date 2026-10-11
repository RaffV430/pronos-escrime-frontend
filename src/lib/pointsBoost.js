// Points ×2 : libellés partagés (badges, bandeaux, administration).
const ROUNDS = { T2: 'la finale', T4: 'les demi-finales', T8: 'les quarts de finale' };
export const boostRoundName = (round) => ROUNDS[round] || `le tableau de ${String(round).slice(1)}`;

// Phrase décrivant ce qui est doublé sur une épreuve.
export function boostSummary(boosts = []) {
  if (!boosts?.length) return '';
  if (boosts.some((b) => b.scope === 'EVENT')) return 'Points doublés sur toute l’épreuve';
  const parts = boosts.map((b) =>
    b.scope === 'POOLS'
      ? 'les poules'
      : b.scope === 'TABLEAU'
        ? 'tout le tableau'
        : b.scope === 'PODIUM'
          ? 'le podium'
          : boostRoundName(b.round),
  );
  return `Points doublés sur ${parts.join(', ').replace(/, ([^,]*)$/, ' et $1')}`;
}

// Onglet « Poules », « Tableau » ou « Podium » concerné par un doublement.
export function boostedTab(boosts = [], tab) {
  return (boosts || []).some(
    (b) =>
      b.scope === 'EVENT' ||
      (tab === 'pools' && b.scope === 'POOLS') ||
      (tab === 'tableau' && ['TABLEAU', 'ROUND'].includes(b.scope)) ||
      (tab === 'podium' && b.scope === 'PODIUM'),
  );
}
