import { useState } from 'react';
import { useRecordedHistory } from '../lib/useRecordedHistory';
import TeamRelayHistory from './TeamRelayHistory';
import TouchStrip from './TouchStrip';

export default function RecordedMatchHistory({ match }) {
  const [open, setOpen] = useState(false);
  const { data, retry } = useRecordedHistory(match.id, open && Boolean(match.isFinished));
  if (!match.isFinished) return null;
  const team =
    data?.podiumFormat === 'TEAM' || match.competition?.podiumFormat === 'TEAM' || match.podiumFormat === 'TEAM';
  const history = data?.history || [];
  const available = history.length > 0 || data?.historyIssue || (team && match.officialRelays?.length > 0);
  return (
    <details className="recorded-match-history" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Historique du suivi live</summary>
      {open &&
        (!data ? (
          <p role="status">Chargement de l’historique…</p>
        ) : data.error ? (
          <p role="status">
            {data.error}{' '}
            <button type="button" className="button-secondary" onClick={retry}>
              Réessayer
            </button>
          </p>
        ) : (
          <>
            {data.historyNotice && (
              <p className="muted" role="status">
                {data.historyNotice}
              </p>
            )}
            {history.length > 0 && (
              <p className="muted">Observations réellement reçues ; des séquences peuvent manquer.</p>
            )}
            {!available ? (
              <p className="muted">Aucune touche enregistrée pour cette rencontre.</p>
            ) : team ? (
              <TeamRelayHistory history={history} issue={data.historyIssue} officialRelays={match.officialRelays} />
            ) : (
              <TouchStrip
                history={history}
                issue={data.historyIssue}
                player1={match.player1}
                player2={match.player2}
                compact
              />
            )}
          </>
        ))}
    </details>
  );
}
