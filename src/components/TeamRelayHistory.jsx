import { useState } from 'react';
import { relayGroups } from '../lib/teamRelayHistory';
import { clockLabel } from '../lib/useLiveScores';
import './team-relay-history.css';
const describe = (event) =>
  event.by === 'gap'
    ? 'Touches intermédiaires non enregistrées'
    : event.by === 'correction'
      ? 'Correction de score reçue'
      : event.by === 'double'
        ? 'Évolution des deux scores reçue'
        : event.by === 1
          ? event.fencer1Name || 'Équipe gauche'
          : event.fencer2Name || 'Équipe droite';
export default function TeamRelayHistory({ history, issue }) {
  const [picked, setPicked] = useState(null);
  if (issue) return <p role="status">{issue}</p>;
  const groups = relayGroups(history);
  if (!groups.length) return <p className="muted">Historique des relais non disponible pour le moment.</p>;
  const recorded = groups.flatMap((g) => g.events).filter((e) => !['start', 'relay'].includes(e.by));
  const selected = recorded.find((e) => e.at === picked) || recorded.at(-1);
  const start = groups[0].events[0];
  return (
    <section className="team-relay-history" aria-label="Historique par relais">
      <h3>
        Fil des touches{' '}
        <small>
          · depuis {start.score1}–{start.score2}
        </small>
      </h3>
      <div className="relay-visual-groups">
        {groups.map((group, index) => {
          const first = group.events[0];
          const events = group.events.filter((e) => !['start', 'relay'].includes(e.by));
          return (
            <div className="relay-visual-group" key={`${first.at}:${index}`}>
              <span
                className="relay-visual-divider"
                title={`Relais ${group.period || '?'} · ${group.fencer1Name || 'Tireur non transmis'} · ${group.fencer2Name || 'Tireur non transmis'}`}
                aria-label={group.period > 0 ? `Relais ${group.period}` : 'Relais non identifié'}
              >
                R{group.period || '?'}
              </span>
              <div
                className="relay-visual-cells"
                role="group"
                aria-label={group.period > 0 ? `Touches du relais ${group.period}` : 'Touches du relais non identifié'}
              >
                {events.map((event, i) => (
                  <button
                    type="button"
                    key={`${event.at}:${i}`}
                    className={`relay-visual-hit by-${event.by}`}
                    aria-pressed={picked === event.at}
                    aria-label={`${event.score1}–${event.score2} · ${describe(event)} · ${clockLabel(event.clock)}`}
                    onClick={() => setPicked(picked === event.at ? null : event.at)}
                  >
                    <span aria-hidden="true">{event.by === 'gap' ? '…' : event.by === 'correction' ? '↺' : ''}</span>
                  </button>
                ))}
                {!events.length && (
                  <small className="muted" title="Aucune touche enregistrée">
                    —
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selected && (
        <p className="relay-visual-caption" role="status">
          <b>
            {selected.score1}–{selected.score2}
          </b>{' '}
          · {describe(selected)}
          {clockLabel(selected.clock) && ` · ${clockLabel(selected.clock)}`}
        </p>
      )}
      {recorded.some((e) => ['gap', 'correction'].includes(e.by)) && (
        <p className="relay-visual-note">… touches manquantes · ↺ correction</p>
      )}
    </section>
  );
}
