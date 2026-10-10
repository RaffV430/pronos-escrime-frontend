// Pool times describe the whole pool, never an individual bout.
export function followedPool(pools, name, allowedNames = []) {
  if (!allowedNames.includes(name)) return null;
  const candidates = pools.filter(pool =>
    pool.fencers?.filter(fencer => fencer.name === name).length === 1,
  );
  const round = pool => Number(/^Tour (\d+) · /.exec(pool.name)?.[1]) || 1;
  const latestRound = Math.max(0, ...candidates.map(round));
  const latest = candidates.filter(pool => round(pool) === latestRound);
  // Never choose an arbitrary assignment when a source identity occurs twice.
  return latest.length === 1 ? latest[0] : null;
}

export function followedSchedule(match, pool) {
  // A current pool takes precedence over a previously completed tableau match.
  const source = match && (!match.isFinished || !pool) ? match : pool;
  const date = source?.startsAt ? new Date(source.startsAt) : null;
  return {
    time: date && !Number.isNaN(date.getTime())
      ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : 'Horaire à confirmer',
    strip: source?.strip ? `Piste ${source.strip}` : 'Piste à confirmer',
    poolName: source === pool ? pool?.name : null,
  };
}
