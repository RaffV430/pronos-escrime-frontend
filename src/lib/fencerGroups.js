// Dates supplied by the server; unknown schedules never outrank a known event.
export function fencerGroupStart(group) {
  if (!group.appearance) return Infinity;
  const start = Date.parse(group.appearance.event.startsAt);
  if (Number.isFinite(start)) return start;
  const times = group.cards
    .flatMap((c) => c.appearance.matches)
    .map((m) => Date.parse(m.startsAt))
    .filter(Number.isFinite);
  return times.length ? Math.min(...times) : Infinity;
}
export function prioritizeFencerGroups(groups, now) {
  const known = groups
    .filter((g) => Number.isFinite(fencerGroupStart(g)))
    .sort((a, b) => fencerGroupStart(a) - fencerGroupStart(b));
  const liveFrom = now + 90 * 60 * 1000;
  const current = known.filter((g) => fencerGroupStart(g) <= liveFrom);
  const future = known.filter((g) => fencerGroupStart(g) > liveFrom);
  // Simultaneous events share priority rather than choosing one arbitrarily.
  const next = future.length ? future.filter((g) => fencerGroupStart(g) === fencerGroupStart(future[0])) : [];
  return {
    live: current.length > 0,
    featured: current.length ? current : next,
    upcoming: current.length ? future : future.filter((g) => !next.includes(g)),
    unknown: groups.filter((g) => !Number.isFinite(fencerGroupStart(g))),
  };
}
