export const searchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function searchEvents(tournaments = [], calendar = []) {
  const items = tournaments.flatMap((t) =>
    (t.competitions || []).map((event) => ({
      kind: 'event',
      key: `e:${event.id}`,
      name: `${t.name} · ${event.name}`,
      detail: [t.city, event.city, 'Épreuve'].filter(Boolean).join(' · '),
      event,
      tournament: t,
    })),
  );
  for (const entry of calendar) {
    const ids = entry.competitionIds || (entry.competitions || []).map((c) => c.id);
    const linked = items.filter((item) => item.event && ids.includes(item.event.id));
    const description = [entry.city, entry.label, entry.weapon, ...(entry.categories || []), entry.start]
      .filter(Boolean)
      .join(' · ');
    if (linked.length) {
      for (const item of linked) {
        item.searchable = `${item.name} ${item.detail} ${description}`;
        item.detail = [entry.city, 'Épreuve'].filter(Boolean).join(' · ');
      }
    } else {
      items.push({
        kind: 'event',
        key: `calendar:${entry.id || description}`,
        name: [entry.city, entry.label].filter(Boolean).join(' · '),
        detail: [entry.weapon, ...(entry.categories || []), entry.start, 'Calendrier'].filter(Boolean).join(' · '),
        searchable: description,
        calendar: true,
      });
    }
  }
  return items;
}
