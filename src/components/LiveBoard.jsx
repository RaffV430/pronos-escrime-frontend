// Tableau de score « en grand » d'une rencontre suivie en direct : une moitié par tireur (rouge / vert),
// lampes de touche, chrono et période au centre, score géant et fil des touches.
import { isFollowedFencer, useFencerFollows } from '../lib/fencerFollows';
import { clockLabel } from '../lib/useLiveScores';
import TouchStrip from './TouchStrip';
import { shortName } from '../lib/fencerName';

const initials = (name) =>
  String(name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('');

export default function LiveBoard({ match, live }) {
  const follows = useFencerFollows();
  const finished = match.isFinished || live?.finished;
  const score = (i) =>
    match.isFinished && Number.isInteger(match[`score${i}`])
      ? match[`score${i}`]
      : live && !live.finished
        ? live[`score${i}`]
        : (live?.history?.at(-1)?.[`score${i}`] ?? '—');
  const s1 = score(1),
    s2 = score(2);
  const leader = Number(s1) > Number(s2) ? 1 : Number(s2) > Number(s1) ? 2 : 0;
  const period = live?.period > 0 && live.period < 10 ? live.period : null;
  return (
    <article className="live-board" aria-label={`${match.player1} contre ${match.player2}`}>
      <div className="live-board-lamps" aria-hidden="true">
        <span className={live?.fencer1?.lamp && !finished ? 'is-lit' : ''} />
        <span className={live?.fencer2?.lamp && !finished ? 'is-lit' : ''} />
      </div>
      <div className="live-board-duel">
        {[1, 2].map((i) => {
          const name = match[`player${i}`];
          const country = match[`player${i}Country`] || live?.[`fencer${i}`]?.country;
          const seed = match[`seed${i}`];
          return (
            <div className={`live-board-side side-${i}${leader === i ? ' is-leading' : ''}`} key={i}>
              <span className="live-board-avatar">{initials(name)}</span>
              <strong className="live-board-name">
                {shortName(name)}
                {isFollowedFencer(follows, name) && <span title="Tireur suivi"> ★</span>}
              </strong>
              <small>{[country, seed ? `TS ${seed}` : null].filter(Boolean).join(' · ')}</small>
              <b className="live-board-score">{i === 1 ? s1 : s2}</b>
            </div>
          );
        })}
        <div className="live-board-clock">
          {finished ? (
            <b>FIN</b>
          ) : (
            <>
              <b>{clockLabel(live?.clock) || '—'}</b>
              {period && <small>{period === 1 ? '1re' : `${period}e`} pér.</small>}
            </>
          )}
        </div>
      </div>
      <TouchStrip history={live?.history} player1={match.player1} player2={match.player2} />
    </article>
  );
}
