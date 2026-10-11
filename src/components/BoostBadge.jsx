import { boostSummary } from '../lib/pointsBoost';
// Badge « Points ×2 » (match, poule, podium, épreuve ou tournoi).
export default function BoostBadge({ multiplier = 2, label = null, compact = false }) {
  if (!(multiplier > 1)) return null;
  return (
    <span className={`boost-badge${compact ? ' is-compact' : ''}`} title={`Points ×${multiplier}`}>
      <span aria-hidden="true">🔥</span>
      {compact ? `×${multiplier}` : label || `Points ×${multiplier}`}
    </span>
  );
}

// Bandeau d'épreuve : à partir de l'activation, les pronostics encore ouverts comptent double.
export function BoostBanner({ boosts }) {
  const text = boostSummary(boosts);
  if (!text) return null;
  return (
    <p className="boost-banner" role="note">
      <span aria-hidden="true">🔥</span>
      <span>
        <strong>{text}</strong>
        <small>Les pronostics encore ouverts au lancement du bonus comptent double.</small>
      </span>
    </p>
  );
}
