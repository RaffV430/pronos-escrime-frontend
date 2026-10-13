// Bandeau « En direct » d'une rencontre : piste, chrono, période et score qui évolue.
// Avec onOpen, tout le bandeau ouvre le suivi en grand dans le Direct.
import { clockLabel } from '../lib/useLiveScores';
import { useI18n } from '../i18n/context';
import './live-score.css';

// Lampe de l'appareil : rouge pour le tireur 1, verte pour le tireur 2 (comme le fil des touches),
// blanche pour une touche non valable (fleuret).
const lampClass = (fencer, side) => (fencer?.lamp ? `is-lit is-lit-${side}` : fencer?.white ? 'is-white' : undefined);

export default function LiveScore({ live, compact = false, onOpen = null }) {
  const { t } = useI18n();
  if (!live || live.finished) return null;
  const period = live.period > 0 && live.period < 10 ? ` · ${t('live.period', { n: live.period })}` : '';
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      className={`live-score${compact ? ' is-compact' : ''}`}
      role={onOpen ? undefined : 'status'}
      aria-live="polite"
      aria-label={onOpen ? t('live.openAria', { s1: live.score1, s2: live.score2 }) : undefined}
      onClick={
        onOpen
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpen(live.matchId);
            }
          : undefined
      }
    >
      <span className="live-score-tag">
        <span className="live-score-dot" aria-hidden="true" />
        {t('live.badge')}
      </span>
      <span className="live-score-meta">
        {t('live.strip', { strip: live.strip })}
        {clockLabel(live.clock) && ` · ${clockLabel(live.clock)}`}
        {period}
      </span>
      <b className="live-score-value">
        <span className={lampClass(live.fencer1, 1)}>{live.score1}</span>–
        <span className={lampClass(live.fencer2, 2)}>{live.score2}</span>
      </b>
      {onOpen && <span className="live-score-open">{t('live.seeBig')}</span>}
    </Tag>
  );
}
