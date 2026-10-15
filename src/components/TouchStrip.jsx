// Fil des touches : une case par touche, rouge (tireur 1), verte (tireur 2) ou dorée (coup double),
// de plus en plus vive vers les touches récentes. Une case touchée affiche le score à ce moment-là.
import { useState } from 'react';
import { clockLabel } from '../lib/useLiveScores';
import { shortName } from '../lib/fencerName';
import { useI18n } from '../i18n/context';

export default function TouchStrip({ history, player1, player2, live = false, compact = false, title = null, issue = null }) {
  // Assaut en cours : dernière case agrandie. À la fin, elle reste agrandie quelques secondes puis
  // reprend sa taille (animation CSS) ; un match déjà terminé à l'ouverture s'affiche normalement.
  const { t } = useI18n();
  const periodLabel = (p) => (p > 0 && p < 10 ? ` · ${t('live.periodShort', { n: p })}` : '');
  const [wasLive, setWasLive] = useState(live);
  if (live && !wasLive) setWasLive(true);
  const touches = (history || []).filter((x) => [1, 2, 'double'].includes(x.by));
  const start = (history || []).find((x) => x.by === 'start');
  const [picked, setPicked] = useState(null);
  if (issue) return <p className="touch-strip-warning" role="status">{issue}</p>;
  if (!touches.length && !start) return null;
  const shown = picked === null ? touches.at(-1) : touches[picked];
  const who = (x) => (x.by === 1 ? shortName(player1) : x.by === 2 ? shortName(player2) : t('touches.double'));
  return (
    <div className={`touch-strip${compact ? ' is-compact' : ''}${live ? ' is-live' : wasLive ? ' is-ending' : ''}`}>
      <p className="touch-strip-title">
        {title || t('touches.title')}
        {start && <small> · {t('touches.since', { s1: start.score1, s2: start.score2 })}</small>}
      </p>
      <div className="touch-strip-track">
        <div className="touch-strip-cells" role="list">
          {touches.map((x, i) => (
            <button
              type="button"
              role="listitem"
              key={i}
              className={`touch-cell by-${x.by}${picked === i ? ' is-picked' : ''}`}
              data-last={i === touches.length - 1 ? '' : undefined}
              aria-label={`${x.score1}–${x.score2}, ${who(x)}, ${clockLabel(x.clock)}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPicked(picked === i ? null : i);
              }}
            />
          ))}
        </div>
        {touches.length > 1 && (
          <p className="touch-strip-axis" aria-hidden="true">
            <span>{t('touches.first')}</span>
            <span>{t('touches.last')}</span>
          </p>
        )}
      </div>
      {shown && (
        <p className="touch-strip-caption">
          <b>
            {shown.score1}–{shown.score2}
          </b>{' '}
          {who(shown)}
          {clockLabel(shown.clock) && ` · ${clockLabel(shown.clock)}`}
          {periodLabel(shown.period)}
          {picked === null && touches.length > 1 && <small> · {t('touches.lastTouch')}</small>}
        </p>
      )}
    </div>
  );
}
