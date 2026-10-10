const normalized = (v) =>
  String(v || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
// The server winner is authoritative. Never infer elimination from a missing score.
export function fencerProgress(appearance, entryName) {
  if (!appearance) return { finished: false, rank: null };
  const rank =
    appearance.event.resultsVerifiedAt && appearance.event.officialPodium?.finalConfirmed
      ? appearance.event.officialPodium.classification?.find((r) => r.entryId === appearance.entryId) || null
      : null;
  const rounds = appearance.matches.filter((m) => /^T\d+$/.test(m.round) && m.resultType !== 'CANCELLED');
  const latest = rounds.slice().sort((a, b) => Number(a.round.slice(1)) - Number(b.round.slice(1)) || b.id - a.id)[0];
  const lost =
    !latest?.syncIssue &&
    latest?.isFinished &&
    [1, 2].includes(latest.winner) &&
    normalized(latest[`player${3 - latest.winner}`]) === normalized(entryName);
  const final = !latest?.syncIssue && latest?.round === 'T2' && latest.isFinished && [1, 2].includes(latest.winner);
  return {
    finished: Boolean(rank || lost || final),
    eliminated: Boolean(lost),
    rank: rank?.rank || null,
    tied: Boolean(rank?.tied),
  };
}
