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
