import { segment } from './routes';
export function calendarPredictionPath(event) {
  if (!event.tournamentId) return '/calendrier';
  const base = `/pronostiquer/${segment(event.tournamentName || event.label, event.tournamentId)}`;
  const competitions = event.competitions || [];
  if (competitions.length !== 1) return base;
  const competition = competitions[0];
  return `${base}/${segment(competition.name, competition.id)}/poules`;
}
