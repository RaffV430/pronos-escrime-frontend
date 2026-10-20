// Pool times describe the whole pool, never an individual bout.
// club : homonyme d'un autre club dans l'épreuve, reconnu au nom et au club.
export function followedPool(pools, name, allowedNames = [], club = null) {
  if (!allowedNames.includes(name) && !club) return null;
  const candidates = pools.filter(pool =>
    pool.fencers?.filter(fencer => fencer.name === name && (!club || fencer.club === club)).length === 1,
  );
  const round = pool => Number(/^Tour (\d+) · /.exec(pool.name)?.[1]) || 1;
  const latestRound = Math.max(0, ...candidates.map(round));
  const latest = candidates.filter(pool => round(pool) === latestRound);
  // Never choose an arbitrary assignment when a source identity occurs twice.
  return latest.length === 1 ? latest[0] : null;
}

export function followedSchedule(match, pool) {
  // Finishing a tableau match must not restore an earlier pool schedule.
  // A later pool round can still take over after a completed tableau match.
  const laterPool = match?.isFinished && pool &&
    Date.parse(pool.startsAt) > Date.parse(match.startsAt);
  const source = match && !laterPool ? match : pool;
  const date = source?.startsAt ? new Date(source.startsAt) : null;
  return {
    time: date && !Number.isNaN(date.getTime())
      ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : 'Horaire à confirmer',
    strip: source?.strip ? `Piste ${source.strip}` : 'Piste à confirmer',
    poolName: source === pool ? pool?.name : null,
  };
}
