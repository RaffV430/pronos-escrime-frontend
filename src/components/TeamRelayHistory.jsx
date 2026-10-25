import { relayGroups } from '../lib/teamRelayHistory';
import { clockLabel } from '../lib/useLiveScores';
import './team-relay-history.css';
export default function TeamRelayHistory({ history, issue, live }) {
  if (issue) return <p role="status">{issue}</p>;
  const groups = relayGroups(history);
  if (!groups.length) return <p className="muted">Historique des relais non disponible pour le moment.</p>;
  return (
    <section className="team-relay-history" aria-label="Historique par relais">
      <h3>Historique par relais</h3>
      <p className="muted">
        Séquences réellement enregistrées. Une interruption du suivi peut laisser des touches manquantes.
      </p>
      {groups.map((group, index) => {
        const first = group.events[0],
          last = group.events.at(-1);
        return (
          <details key={`${first.at}:${index}`} open={index === groups.length - 1}>
            <summary>
              <strong>{group.period > 0 ? `Relais ${group.period}` : 'Relais non identifié'}</strong>
              <span>
                {first.score1}–{first.score2} → {last.score1}–{last.score2}
              </span>
              {live && index === groups.length - 1 && <small>Dernier relais observé</small>}
            </summary>
            <p className="team-relay-names">
              {group.fencer1Name || 'Tireur non transmis'} · {group.fencer2Name || 'Tireur non transmis'}
            </p>
            <ol>
              {group.events.map((event, i) => (
                <li key={`${event.at}:${i}`} className={`relay-event-${event.by}`}>
                  <b>
                    {event.score1}–{event.score2}
                  </b>
                  <span>
                    {event.by === 'start'
                      ? event.truncated
                        ? 'Début de l’historique conservé'
                        : 'Premier score observé'
                      : event.by === 'relay'
                        ? 'Changement de relais observé'
                        : event.by === 'gap'
                          ? 'Score reçu · touches intermédiaires non enregistrées'
                          : event.by === 'correction'
                            ? 'Correction de score reçue'
                            : event.by === 'double'
                              ? 'Évolution des deux scores reçue'
                              : `Touche · ${event.by === 1 ? group.fencer1Name || 'équipe gauche' : group.fencer2Name || 'équipe droite'}`}
                  </span>
                  <time>{clockLabel(event.clock)}</time>
                </li>
              ))}
            </ol>
          </details>
        );
      })}
    </section>
  );
}
