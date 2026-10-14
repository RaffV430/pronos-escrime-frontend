// Presentation only: scores and awarded points always come from the server.
export function officialLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      ['www.fencingtimelive.com', 'fencingtimelive.com', 'engarde-service.com', 'www.engarde-service.com'].includes(
        url.hostname,
      )
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function pisteMatches(matches, { round = '', strip = '', mine = false, userId } = {}) {
  return matches.filter(
    (m) =>
      m.resultType !== 'CANCELLED' &&
      (!round || m.round === round) &&
      (!strip || String(m.strip) === strip) &&
      (!mine || m.predictions?.some((p) => p.userId === userId)),
  );
}
export function pistePrediction(match, userId) {
  const prediction = match?.predictions?.find((p) => p.userId === userId);
  if (!prediction) return { prediction: null, points: null };
  return {
    prediction,
    points:
      match.isFinished && !match.pointsPending && !match.syncIssue
        ? (prediction.pointsEarned ?? 0) + (prediction.bonusPoints ?? 0)
        : null,
  };
}
export function pisteStatus(match) {
  if (match.pointsPending || match.syncIssue) return 'Vérification en cours';
  return match.isFinished ? 'Résultat publié' : match.isClosed ? 'Résultat attendu' : 'Pronostics ouverts';
}

// L’ordre officiel ne change que la présentation, jamais les identifiants ou les pronostics.
export function ftlPresentation(match, live) {
  if (!match || !live || live.finished || live.ftlLeftPlayer !== 2) return { match, live };
  return {
    match: { ...match, player1: match.player2, player2: match.player1,
      player1Country: match.player2Country, player2Country: match.player1Country,
      score1: match.score2, score2: match.score1 },
    live: { ...live, score1: live.score2, score2: live.score1,
      fencer1: live.fencer2, fencer2: live.fencer1,
      history: live.history?.map(t => ({ ...t, score1: t.score2, score2: t.score1,
        by: t.by === 1 ? 2 : t.by === 2 ? 1 : t.by })) },
  };
}
