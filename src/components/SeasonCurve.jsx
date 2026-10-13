import { useState } from 'react';
import { seasonCurve } from '../lib/uxFeatures';
export default function SeasonCurve({ tournaments }) {
  const [index, setIndex] = useState(null),
    [message, setMessage] = useState('');
  const rows = seasonCurve(tournaments);
  if (!rows.length) return null;
  const selected = rows[Math.min(index ?? rows.length - 1, rows.length - 1)];
  const low = Math.min(0, ...rows.map((t) => t.cumulative)),
    high = Math.max(1, ...rows.map((t) => t.cumulative));
  const x = (i) => 35 + (i * 530) / Math.max(1, rows.length - 1),
    y = (value) => 175 - ((value - low) * 135) / (high - low);
  const share = async () => {
    const text = `Ma saison sur Pronos Escrime : ${selected.cumulative} points après ${selected.name}.`;
    try {
      if (navigator.share) await navigator.share({ title: 'Ma saison', text, url: 'https://www.pronos-escrime.fr/' });
      else {
        await navigator.clipboard.writeText(text);
        setMessage('Progression copiée.');
      }
    } catch (e) {
      if (e.name !== 'AbortError') setMessage('Partage indisponible.');
    }
  };
  return (
    <details className="ux-season-curve" open>
      <summary>Ma progression · points cumulés</summary>
      <svg
        viewBox="0 0 600 210"
        role="img"
        aria-label={`Progression : ${rows.map((t) => `${t.name}, ${t.cumulative} points`).join(' ; ')}`}
      >
        <path d="M30 25V180H575" fill="none" stroke="currentColor" opacity=".2" />
        <polyline
          points={rows.map((t, i) => `${x(i)},${y(t.cumulative)}`).join(' ')}
          fill="none"
          stroke="var(--primary, #225da8)"
          strokeWidth="3"
        />
        {rows.map((t, i) => (
          <circle
            key={t.id}
            cx={x(i)}
            cy={y(t.cumulative)}
            r={t.id === selected.id ? 7 : 4}
            fill="var(--primary, #225da8)"
          />
        ))}
      </svg>
      <label>
        Étape
        <select value={selected.id} onChange={(e) => setIndex(rows.findIndex((t) => t.id === Number(e.target.value)))}>
          {rows.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        <strong>{selected.cumulative} points</strong> après {selected.name} · {selected.points >= 0 ? '+' : ''}
        {selected.points} sur ce tournoi.
      </p>
      <button className="button-link" onClick={share}>
        Partager ma progression ↗
      </button>
      {message && <p role="status">{message}</p>}
    </details>
  );
}
