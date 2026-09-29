// Lieu de compétition : libellés d'une ville proposée et contrôle d'une heure convertie à Paris.
export function venueLabel(city) {
  if (!city) return '';
  return [city.name, city.region, city.country].filter(Boolean).join(', ');
}

// « 18:15 à Paris » pour une heure UTC, afin de repérer d'un coup d'œil un fuseau erroné.
export function parisTime(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

// Heure locale du lieu pour une heure UTC (affichée à côté de l'heure de Paris).
export function venueTime(iso, timezone) {
  if (!iso || !timezone) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return null;
  }
}
