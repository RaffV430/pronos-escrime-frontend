import { segment } from './routes.js';
export function calendarPredictionPath(event) {
  if (!event.tournamentId) return '/calendrier';
  const base = `/pronostiquer/${segment(event.tournamentName || event.label, event.tournamentId)}`;
  const competitions = event.competitions || [];
  if (competitions.length !== 1) return base;
  const competition = competitions[0];
  const view = event.predictionView === 'tableau' ? 'tableau' : 'poules';
  const phase =
    view === 'tableau' && ['main', 'preliminary'].includes(event.tableauPhase) ? `?phase=${event.tableauPhase}` : '';
  return `${base}/${segment(competition.name, competition.id)}/${view}${phase}`;
}
