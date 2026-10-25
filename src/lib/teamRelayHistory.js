// Keep source order: corrections and missing periods must never be inferred from scores.
export function relayGroups(history = [], officialRelays = []) {
  const groups = [];
  const source = history || [];
  const firstReal = source.findIndex((e) => !['start', 'relay'].includes(e.by));
  const visible =
    firstReal > 0 &&
    source.slice(0, firstReal).every((e) => e.score1 === 0 && e.score2 === 0) &&
    source[0].period > source[firstReal].period
      ? source.slice(firstReal)
      : source;
  for (const raw of visible) {
    const event = raw.by === 'double' ? { ...raw, by: 'gap' } : raw;
    let group = groups.at(-1);
    if (
      !group ||
      event.by === 'relay' ||
      event.period !== group.period ||
      event.fencer1Name !== group.fencer1Name ||
      event.fencer2Name !== group.fencer2Name
    ) {
      group = { period: event.period, fencer1Name: event.fencer1Name, fencer2Name: event.fencer2Name, events: [] };
      groups.push(group);
    }
    group.events.push(event);
  }
  for (const official of officialRelays || []) {
    const existing = groups.filter((g) => g.period === official.period).at(-1);
    if (existing) existing.official = official;
    else {
      const missing = {
        period: official.period,
        fencer1Name: official.fencer1Name,
        fencer2Name: official.fencer2Name,
        events: [],
        official,
      };
      const next = groups.findIndex((g) => g.period > official.period);
      if (next < 0) groups.push(missing);
      else groups.splice(next, 0, missing);
    }
  }
  return groups;
}
