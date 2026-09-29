export function roundLabel(round) {
  return { T4: 'Semi-finales', T2: 'Finale' }[round] || round;
}
export function isMatchClosed(match, now) {
  if (match.isFinished || match.syncIssue) return true;
  if (match.manualUnlockUntil) return now >= Date.parse(match.manualUnlockUntil);
  return Boolean(
    match.timingUnverified ||
    match.isLocked ||
    (!match.awaitingPreviousRound && match.closesAt && now >= Date.parse(match.closesAt)),
  );
}
// « À venir » : tout match dont le résultat n'est pas encore publié, pronostics ouverts ou clos.
export function isUpcoming(match) {
  return !match.isFinished && match.resultType !== 'CANCELLED';
}
export function validateScores(values, maxScore = 15) {
  const scores = [values.score1, values.score2];
  if (!scores.every((v) => /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) && Number(v) <= maxScore))
    return `Saisissez deux scores entiers entre 0 et ${maxScore}.`;
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
  const roundOrder = (value) =>
    /^T\d+$/.test(value) ? -Number(value.slice(1)) : /final/i.test(value) && !/demi|quart/i.test(value) ? 0 : 1;
  return [...groups]
    .sort(([a], [b]) => roundOrder(a) - roundOrder(b))
    .map(([round, items]) => ({
      round,
      items: items.sort((a, b) => {
        const position = (m) => Number(m.sourceKey?.match(/:(\d+)$/)?.[1] || m.id);
        return position(a) - position(b);
      }),
    }));
}

// Positions come from official slots, never from the filtered display order.
export function bracketLayout(groups) {
  const size = (round) =>
    /^T(\d+)$/.test(round)
      ? Number(round.slice(1))
      : /^(final|finale)$/i.test(round)
        ? 2
        : /^(semi-finals|demi-finales)$/i.test(round)
          ? 4
          : null;
  const base = Math.max(2, ...groups.map((g) => size(g.round) || 0));
  return groups.map((group) => {
    const count = size(group.round),
      factor = base / count;
    const positions = group.items.map((m) => Number(m.sourceKey?.match(/:(\d+)$/)?.[1]));
    const aligned =
      !!count &&
      Number.isInteger(Math.log2(count)) &&
      Number.isInteger(factor) &&
      positions.every((n) => Number.isInteger(n) && n > 0 && n <= count / 2) &&
      new Set(positions).size === positions.length;
    return {
      ...group,
      rows: base,
      aligned,
      slots: group.items.map((match, i) => ({
        match,
        start: aligned ? (positions[i] - 1) * factor * 2 + 1 : null,
        span: aligned ? factor * 2 : null,
      })),
    };
  });
}

export function entryRank(entries, name) {
  const normalize = (value) =>
    String(value || '')
      .normalize('NFC')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  const found = entries.filter((e) => normalize(e.name) === normalize(name));
  return found.length === 1 && Number.isSafeInteger(found[0].entryRanking) && found[0].entryRanking > 0
    ? found[0].entryRanking
    : null;
}

export function remainingSeconds(match, now) {
  if (isMatchClosed(match, now)) return null;
  const at = Date.parse(match.manualUnlockUntil || match.closesAt || '');
  return Number.isFinite(at) ? Math.max(0, Math.ceil((at - now) / 1000)) : null;
}

export function nextClosingGroup(matches, now) {
  const upcoming = matches
    .map((match) => ({
      match,
      at: Date.parse(match.manualUnlockUntil || match.closesAt || ''),
      seconds: remainingSeconds(match, now),
    }))
    .filter((x) => x.seconds > 0 && x.seconds <= 600)
    .sort((a, b) => a.at - b.at);
  if (!upcoming.length) return null;
  const { at, seconds } = upcoming[0],
    affected = upcoming.filter((x) => x.at === at).map((x) => x.match);
  return { seconds, matches: affected, rounds: [...new Set(affected.map((m) => m.round || 'Rencontres'))] };
}

export function eventLanding(matches, userId, now = Date.now(), team = false) {
  const valid = matches.filter((m) => m.resultType !== 'CANCELLED');
  if (!valid.length) return { tab: team ? 'tableau' : 'pools', filter: 'Tous' };
  const open = valid.filter((m) => !isMatchClosed(m, now));
  const missing = open.some((m) => !m.predictions?.some((p) => p.userId === userId));
  return {
    tab: 'tableau',
    filter: missing
      ? 'À compléter'
      : open.length
        ? 'À venir'
        : valid.every((m) => m.isFinished)
          ? 'Résultats publiés'
          : 'Tous',
  };
}

// Prochain match à pronostiquer après `currentId`, dans l'ordre affiché (on
// repart du début si besoin). `eligible(id)` : match ouvert et sans pronostic.
export function nextMatchId(orderedIds, currentId, eligible) {
  const start = orderedIds.indexOf(currentId);
  const order = start < 0 ? orderedIds : [...orderedIds.slice(start + 1), ...orderedIds.slice(0, start)];
  return order.find((id) => id !== currentId && eligible(id)) ?? null;
}

// Piste annoncée par FencingTimeLive : numéro, ou couleur des pistes de finale.
const STRIP_COLORS = { blue: 'bleue', red: 'rouge', yellow: 'jaune', green: 'verte' };
export const stripLabel = (strip) => {
  const value = String(strip ?? '').trim();
  if (!value) return '';
  return `Piste ${STRIP_COLORS[value.toLowerCase()] || value}`;
};
