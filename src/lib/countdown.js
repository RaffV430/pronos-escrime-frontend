// Au-delà d'une heure : « 2 h 05 » plutôt que « 125:30 ».
export function countdownText(seconds) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = seconds % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function countdownLabel(seconds) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60);
  return h
    ? `${h} heure${h > 1 ? 's' : ''} ${m} minute${m > 1 ? 's' : ''}`
    : `${m} minute${m > 1 ? 's' : ''} ${seconds % 60} secondes`;
}
