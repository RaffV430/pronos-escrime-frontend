// Keep source order: corrections and missing periods must never be inferred from scores.
export function relayGroups(history = []) {
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
  return groups;
}
