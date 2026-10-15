import { livePistes } from '../lib/livePistes';
import { clockLabel } from '../lib/useLiveScores';
import { useNow } from '../lib/polling';
import { roundLabel } from './matchPresentation';
import './live-pistes.css';
export default function LivePistes({ matches, live, selectedId, onSelect, ready, error }) {
  const now = useNow(5000);
  const rows = livePistes(matches, live, now);
  return (
    <section className="feature-panel live-pistes" aria-labelledby="live-pistes-title">
      <h2 id="live-pistes-title">
        Matchs diffusés en live <span>({rows.length})</span>
      </h2>
      <p className="muted">
        Épreuve sélectionnée · choisissez un match pour le suivre en grand. Les tireurs gardent leur côté officiel FTL.
      </p>
      {!ready ? (
        <p role="status">Vérification des scores live…</p>
      ) : (
        !rows.length && (
          <p>
            {error
              ? 'Scores live indisponibles pour le moment.'
              : 'Aucun score live récent diffusé pour cette épreuve. Seules les rencontres reconnues par l’application apparaissent ici.'}
          </p>
        )
      )}
      <div className="live-pistes-grid">
        {rows.map(({ match: m, live: s }) => (
          <button
            type="button"
            className="live-pistes-card"
            key={m.id}
            aria-pressed={m.id === selectedId}
            onClick={() => onSelect(m.id)}
          >
            <span className="live-pistes-meta">
              <strong>{roundLabel(m.round)}</strong>
              <span>Piste {s.strip || m.strip || 'non précisée'}</span>
            </span>
            <span className="live-pistes-duel">
              {[1, 2].map((i) => (
                <span key={i}>
                  <span>{m[`player${i}`]}</span>
                  <small>{m[`player${i}Country`]}</small>
                  <b
                    className={`live-pistes-number lamp-${i}${s[`fencer${i}`]?.lamp ? ' is-lit' : s[`fencer${i}`]?.white ? ' is-white' : ''}`}
                    aria-label={`Score ${s[`score${i}`] ?? 'indisponible'}${s[`fencer${i}`]?.lamp ? ', lampe allumée' : s[`fencer${i}`]?.white ? ', touche non valable' : ''}`}
                  >
                    {s[`score${i}`] ?? '—'}
                  </b>
                </span>
              ))}
            </span>
            <span className="live-pistes-meta">
              <span>
                {clockLabel(s.clock)}
                {s.period ? ` · Période ${s.period}` : ''}
              </span>
              <span>
                Signal à{' '}
                {new Date(s.updatedAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
