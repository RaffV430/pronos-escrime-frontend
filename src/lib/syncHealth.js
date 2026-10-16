export function nextControlText(control, now) {
  if (!control.nextAutomaticAt) return '—';
  if (control.late) return 'En retard';
  const remaining = Date.parse(control.nextAutomaticAt) - now;
  if (remaining < 60000) return 'Contrôle imminent';
  const minutes = Math.ceil(remaining / 60000);
  return minutes < 60 ? `dans ${minutes} min` : new Date(control.nextAutomaticAt).toLocaleString('fr-FR');
}
export function resumeText(resume) {
  const date = new Date(resume.startsAt);
  const format = (timeZone) =>
    new Intl.DateTimeFormat('fr-FR', {
      timeZone,
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  const paris = format('Europe/Paris');
  const local =
    resume.timezone && resume.timezone !== 'Europe/Paris'
      ? ` · ${format(resume.timezone)} (${resume.timezone === 'Asia/Tokyo' ? 'Tokyo' : resume.timezone})`
      : '';
  return `En attente de reprise J2 · ${paris} (Paris)${local}`;
}
