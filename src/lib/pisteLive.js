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
