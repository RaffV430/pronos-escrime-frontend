import { useEffect, useState } from 'react';
import API from '../api';

// Animation du tournoi : qui joue, qui n'a encore rien pronostiqué, et relance en un clic.
export default function EngagementPanel({ tournamentId, competitionId }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState({ busy: false, message: '', error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!tournamentId) return;
    const c = new AbortController();
    API.get(`/admin/engagement/${tournamentId}`, { signal: c.signal })
      .then(({ data }) => setData(data))
      .catch((e) => {
        if (!c.signal.aborted) setState((s) => ({ ...s, error: e.response?.data?.error || 'Animation indisponible.' }));
      });
    return () => c.abort();
  }, [tournamentId, revision]);
  const current = data?.competitions.find((c) => c.id === competitionId);
  const remind = async () => {
    setState({ busy: true, message: '', error: '' });
    try {
      const { data: r } = await API.post(`/admin/engagement/${competitionId}/remind`);
      setState({
        busy: false,
        error: '',
        message: r.sent
          ? `Relance envoyée à ${r.players} joueur${r.players > 1 ? 's' : ''} (${r.openMatches} match${r.openMatches > 1 ? 's' : ''} ouvert${r.openMatches > 1 ? 's' : ''}).`
          : 'Tous les joueurs abonnés ont déjà pronostiqué les matchs ouverts.',
      });
      setRevision((n) => n + 1);
    } catch (e) {
      setState({ busy: false, message: '', error: e.response?.data?.error || 'Relance impossible.' });
    }
  };
  return (
    <details className="feature-panel engagement">
      <summary>
        Animation du tournoi
        {data && (
          <span className="muted">
            {' '}
            · {data.activePlayers}/{data.users} joueurs actifs ({data.participation} %)
          </span>
        )}
      </summary>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {data && (
        <>
          <table className="engagement-table">
            <thead>
              <tr>
                <th scope="col">Épreuve</th>
                <th scope="col">Joueurs</th>
                <th scope="col">Pronostics</th>
                <th scope="col">Matchs ouverts</th>
              </tr>
            </thead>
            <tbody>
              {data.competitions.map((c) => (
                <tr key={c.id} className={c.id === competitionId ? 'is-current' : ''}>
                  <th scope="row">{c.name}</th>
                  <td>{c.players}</td>
                  <td>{c.predictions}</td>
                  <td>{c.openMatches}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <button onClick={remind} disabled={state.busy || !current?.openMatches}>
              {state.busy ? 'Envoi…' : 'Relancer les joueurs sans pronostic'}
            </button>{' '}
            <small className="muted">
              Notification aux joueurs abonnés qui n’ont pas pronostiqué tous les matchs ouverts de cette épreuve (une
              fois toutes les 30 min au plus).
            </small>
          </p>
          {state.message && <p role="status">{state.message}</p>}
          {data.inactive.length > 0 && (
            <details>
              <summary>
                {data.inactive.length} joueur{data.inactive.length > 1 ? 's' : ''} sans aucun pronostic sur ce tournoi
              </summary>
              <p className="engagement-inactive">{data.inactive.map((u) => u.name).join(' · ')}</p>
            </details>
          )}
        </>
      )}
    </details>
  );
}
