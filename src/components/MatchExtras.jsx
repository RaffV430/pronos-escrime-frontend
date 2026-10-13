import ChallengeCard from './ChallengeCard';
import { useState } from 'react';
import { pointDetails } from '../lib/uxFeatures';
export default function MatchExtras({ match, prediction }) {
  const [open, setOpen] = useState(false);
  const detail = match.isFinished ? pointDetails(prediction, match) : null;
  return (
    <div className="ux-match-extras">
      {detail && (
        <details>
          <summary>
            +{detail.total} {detail.total === 1 ? 'point' : 'points'} · Voir le détail
          </summary>
          <p>{detail.parts.join(' · ')}</p>
        </details>
      )}
      {!match.isFinished && (
        <button
          type="button"
          className="button-link"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          Défier un ami ↗
        </button>
      )}
      {open && !match.isFinished && (
        <ChallengeCard match={match} prediction={prediction} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
