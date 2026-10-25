// Keep source order: corrections and missing periods must never be inferred from scores.
export function relayGroups(history = [], officialRelays = []) {
  const groups = [];
  for (const event of history || []) {
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
    else
      groups.push({
        period: official.period,
        fencer1Name: official.fencer1Name,
        fencer2Name: official.fencer2Name,
        events: [],
        official,
      });
  }
  return groups.sort((a, b) => (a.period || 99) - (b.period || 99));
}
