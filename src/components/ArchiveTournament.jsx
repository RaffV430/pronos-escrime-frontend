import { useEffect, useState } from 'react';
import API from '../api';

// Archivage du tournoi entier (administration).
export default function ArchiveTournament({ tournamentId }) {
  const [status, setStatus] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState({ busy: false, error: '', done: '' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!tournamentId) return;
    const c = new AbortController();
    API.get(`/admin/tournaments/${tournamentId}/archive`, { signal: c.signal })
      .then(({ data }) => setStatus(data))
      .catch(() => {});
    return () => c.abort();
  }, [tournamentId, revision]);

  const run = async (path, body, done) => {
    setState({ busy: true, error: '', done: '' });
    try {
      await API.post(`/admin/tournaments/${tournamentId}/${path}`, body);
      setState({ busy: false, error: '', done });
      setConfirming(false);
      setRevision((n) => n + 1);
    } catch (e) {
      setState({ busy: false, error: e.response?.data?.error || 'Opération impossible.', done: '' });
    }
  };

  if (!status) return null;
  const incomplete = status.competitions.filter((c) => !c.complete);
  return (
    <section className="feature-panel archive-tournament">
      <h3>Archivage du tournoi « {status.name} »</h3>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {state.done && <p role="status">{state.done}</p>}
      {status.archivedAt ? (
        <>
          <p>
            Archivé le {new Date(status.archivedAt).toLocaleString('fr-FR')}. Il n’apparaît plus dans « Pronostiquer »
            et son suivi FencingTimeLive est arrêté ; résultats, points et classements restent consultables.
          </p>
          <button
            className="button-secondary"
            disabled={state.busy}
            onClick={() => run('unarchive', {}, 'Tournoi désarchivé.')}
          >
            Désarchiver
          </button>
        </>
      ) : !confirming ? (
        <>
          <p className="muted">
            L’archivage retire tout le tournoi de « Pronostiquer » et arrête son suivi automatique. Les résultats,
            points et classements sont conservés.
          </p>
          <button className="button-danger" disabled={state.busy || status.running} onClick={() => setConfirming(true)}>
            Archiver tout le tournoi
          </button>
          {status.running && <p className="muted">Un contrôle FencingTimeLive est en cours : patientez.</p>}
        </>
      ) : (
        <div className="archive-confirm">
          <p>
            <strong>Confirmer l’archivage de « {status.name} » ?</strong>
          </p>
          {incomplete.length > 0 && (
            <p>
              Épreuve(s) pas encore terminée(s) selon les données importées : {incomplete.map((c) => c.name).join(', ')}
              .
            </p>
          )}
          {status.openMatches > 0 && (
            <p>
              {status.openMatches} match(s) sans résultat : les joueurs ne pourront plus les pronostiquer depuis «
              Pronostiquer ».
            </p>
          )}
          <button
            className="button-danger"
            disabled={state.busy}
            onClick={() => run('archive', { confirm: true }, 'Tournoi archivé.')}
          >
            Confirmer l’archivage
          </button>
          <button className="button-secondary" disabled={state.busy} onClick={() => setConfirming(false)}>
            Annuler
          </button>
        </div>
      )}
    </section>
  );
}
