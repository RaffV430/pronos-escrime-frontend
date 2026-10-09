// Les horaires viennent du serveur ; aucune date ni heure locale n'est reconstruite ici.
export function nextEventStart(tournaments, now, competitionId = null) {
  return (
    (tournaments || [])
      .flatMap((t) => t.competitions || [])
      .filter((c) => competitionId == null || c.id === competitionId)
      .map((c) => c.startsAt)
      .filter((d) => typeof d === 'string' && Date.parse(d) > now)
      .sort((a, b) => Date.parse(a) - Date.parse(b))[0] || null
  );
}

// Le calendrier fixe la priorité ; seuls les horaires explicites du serveur autorisent un compte à rebours.
export function nextCalendarEvent(events, tournaments, now) {
  const competitions = new Map((tournaments || []).flatMap(t => (t.competitions || []).map(c => [c.id, {...c, tournamentName: t.name}])));
  const candidates = (events || []).flatMap(event => {
    const linked = (event.competitionIds || []).map(id => competitions.get(id)).filter(Boolean);
    const future = linked.filter(c => typeof c.startsAt === 'string' && Date.parse(c.startsAt) > now).sort((a,b) => Date.parse(a.startsAt)-Date.parse(b.startsAt));
    if (future.length) return [{...event,...future[0]}];
    if (linked.length && linked.every(c => Number.isFinite(Date.parse(c.startsAt)) && Date.parse(c.startsAt) <= now)) return [];
    if (event.start < new Date(now).toISOString().slice(0,10)) return [];
    return [{...event, startsAt:null}];
  });
  return candidates.sort((a,b) => a.start.localeCompare(b.start) || (Date.parse(a.startsAt) || Infinity)-(Date.parse(b.startsAt) || Infinity))[0] || null;
}
