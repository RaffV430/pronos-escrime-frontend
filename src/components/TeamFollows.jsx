import { useEffect, useState } from 'react';
import API from '../api';
import { useFencerFollows } from '../lib/fencerFollows';

// Épreuve par équipes : suivre des équipes dans CETTE épreuve (toutes les équipes de France ont le même
// nom d'une épreuve à l'autre). Une équipe où figure un de « Mes tireurs » est suivie automatiquement.
export default function TeamFollows({ competitionId }) {
  const follows = useFencerFollows();
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    API.get('/me/fencers/teams', { params: { competitionId }, signal: c.signal, forceRefresh: true })
      .then(({ data }) => setTeams(data.teams || []))
      .catch(() => !c.signal.aborted && setError('Liste des équipes indisponible.'));
    return () => c.abort();
  }, [competitionId, version]);
  if (!teams?.length && !error) return null;
  const followed = teams?.filter((t) => t.followId || t.autoMember) || [];
  const toggle = async (team) => {
    setBusy(true);
    setError('');
    try {
      if (team.followId) await API.delete(`/me/fencers/teams/${team.followId}`);
      else await API.post('/me/fencers/teams', { competitionId, entryId: team.entryId });
      setVersion((v) => v + 1);
      follows?.refresh?.();
    } catch (e) {
      setError(e.response?.data?.error || 'Suivi non enregistré. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="feature-panel team-follows">
      <summary>
        Équipes suivies dans cette épreuve · {followed.length}
        {followed.length > 0 && <small> ({followed.map((t) => t.name).join(', ')})</small>}
      </summary>
      <p className="muted">
        Une équipe suivie compte comme « Mes tireurs » : filtre, alertes et notifications de ses matchs. Le suivi vaut
        pour cette épreuve seulement.
      </p>
      {error && <p role="alert">{error}</p>}
      <ul className="team-follows-list">
        {(teams || []).map((team) => (
          <li key={team.entryId}>
            <span>
              <strong>{team.name}</strong>
              {team.country && team.country !== team.name && <small> · {team.country}</small>}
              {team.members.length > 0 && <small className="team-members">{team.members.join(' · ')}</small>}
              {team.autoMember && !team.followId && (
                <small className="team-auto">Suivie automatiquement : {team.autoMember} fait partie de l’équipe</small>
              )}
            </span>
            {team.autoMember && !team.followId ? (
              <span className="team-follow-state" aria-label="Suivie automatiquement">
                ★ Auto
              </span>
            ) : (
              <button
                type="button"
                className="button-secondary"
                disabled={busy}
                aria-pressed={Boolean(team.followId)}
                onClick={() => toggle(team)}
              >
                {team.followId ? '★ Suivie' : '☆ Suivre'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
