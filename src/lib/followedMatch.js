import { isMatchClosed } from '../components/matchPresentation.js';

export function followedMatchTarget(appearances, userId, now = Date.now()) {
  const valid = appearances.filter(({ match }) => match.resultType !== 'CANCELLED');
  const time = ({ match }) => Date.parse(match.closesAt || match.startsAt) || Infinity;
  const open = valid.filter(({ match }) => !match.awaitingPreviousRound && !isMatchClosed(match, now)).sort((a, b) => time(a) - time(b));
  const prediction = open.find(({ match }) => !match.predictions?.some(p => p.userId === userId)) || open[0];
  if (prediction) return { ...prediction, mode: 'predictions' };
  const upcoming = valid.filter(({ match }) => !match.isFinished).sort((a, b) => time(a) - time(b))[0];
  const latest = valid.filter(({ match }) => match.isFinished).sort((a, b) => time(b) - time(a))[0];
  return upcoming || latest ? { ...(upcoming || latest), mode: 'follow' } : null;
}
