import { useCallback, useEffect, useState } from 'react';
import API from '../api';
import { roundLabel } from './matchPresentation';
import './AdminReviews.css';

// Écarts mis de côté pendant l'épreuve (le déroulé n'est jamais bloqué) : à traiter ensuite ici.
export default function AdminReviews({ competitionId, onRefresh }) {
  const [matches, setMatches] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const load = useCallback(
    async (signal) => {
      if (!competitionId) return;
      try {
        const [m, d] = await Promise.all([
          API.get('/admin/reviews/matches', { params: { competitionId }, signal }),
          API.get(`/admin/reviews/duplicates/${competitionId}`, { signal }),
        ]);
        setMatches(m.data);
        setDuplicates(d.data.duplicates);
      } catch (error) {
        if (!signal?.aborted) setFeedback(error.response?.data?.error || 'Vérifications indisponibles.');
      }
    },
    [competitionId],
  );
  useEffect(() => {
    const c = new AbortController();
    setMatches(null);
    setDuplicates(null);
    load(c.signal);
    return () => c.abort();
  }, [load]);
  // Confirmation dans la page (les fenêtres de confirmation du navigateur peuvent être bloquées).
  const [pending, setPending] = useState(null);
  const act = (text, fn, done) => !busy && setPending({ text, fn, done });
  const run = async ({ fn, done }) => {
    setPending(null);
    setBusy(true);
    setFeedback('');
    try {
      const { data } = await fn();
      setFeedback(done(data));
      await load();
      onRefresh?.();
    } catch (error) {
      setFeedback(error.response?.data?.error || 'Action impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  const count = (matches?.length || 0) + (duplicates?.filter((d) => d.entries.every((e) => e.active)).length || 0);
  return (
    <details className="feature-panel admin-reviews" open={count > 0}>
      <summary>À vérifier après l’épreuve {matches && duplicates ? `· ${count}` : ''}</summary>
      {feedback && <p role="status">{feedback}</p>}
      {pending && (
        <div className="admin-review-confirm" role="group" aria-label="Confirmer l’action">
          <span>{pending.text}</span>
          <button type="button" disabled={busy} onClick={() => run(pending)}>
            Confirmer
          </button>
          <button type="button" className="button-secondary" disabled={busy} onClick={() => setPending(null)}>
            Annuler
          </button>
        </div>
      )}

      <h3>Matchs de tableau à vérifier</h3>
      {!matches ? (
        <p className="muted">Chargement…</p>
      ) : !matches.length ? (
        <p className="muted">Aucun match en attente de vérification.</p>
      ) : (
        <ul className="admin-review-list">
          {matches.map((m) => (
            <li key={m.id}>
              <strong>
                #{m.id} · {roundLabel(m.round)} · {m.player1} – {m.player2}
              </strong>
              {m.cancelled && <span className="admin-review-badge">Affiche annulée</span>}
              <small>{m.issue}</small>
              {m.official && (
                <small>
                  Affiche officielle : {m.official[0]} – {m.official[1]}
                </small>
              )}
              <small>
                {m.predictions.total} pronostic{m.predictions.total > 1 ? 's' : ''} · {m.predictions.player1} pour{' '}
                {m.player1} · {m.predictions.player2} pour {m.player2}
              </small>
              <div className="admin-review-actions">
                {m.cancelled &&
                  [1, 2].map((side) => {
                    const name = side === 1 ? m.player1 : m.player2;
                    return (
                      <button
                        key={side}
                        className="button-secondary"
                        disabled={busy}
                        onClick={() =>
                          act(
                            `Accorder 1 point (vainqueur) à ceux qui avaient ${name} vainqueur ? Les autres restent à 0.`,
                            () => API.post(`/admin/reviews/matches/${m.id}/winner`, { winner: side }),
                            (d) =>
                              `#${m.id} : ${d.awarded} pronostic${d.awarded > 1 ? 's' : ''} crédité${d.awarded > 1 ? 's' : ''} d’1 point.`,
                          )
                        }
                      >
                        {name} vainqueur (+1)
                      </button>
                    );
                  })}
                <button
                  className="button-secondary"
                  disabled={busy}
                  onClick={() =>
                    act(
                      m.cancelled
                        ? `Clore #${m.id} sans points ?`
                        : `Annuler l’affiche #${m.id} (pronostics conservés, sans points) ?`,
                      () => API.post(`/admin/reviews/matches/${m.id}/close`),
                      () => `#${m.id} clos sans points.`,
                    )
                  }
                >
                  {m.cancelled ? 'Clore sans points' : 'Annuler sans points'}
                </button>
              </div>
              {!m.cancelled && (
                <small className="muted">
                  Match joué avec un résultat à corriger : utilisez « Corriger un résultat officiel » plus bas.
                </small>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3>Inscriptions en double</h3>
      {!duplicates ? (
        <p className="muted">Chargement…</p>
      ) : !duplicates.length ? (
        <p className="muted">Aucun tireur inscrit deux fois.</p>
      ) : (
        <ul className="admin-review-list">
          {duplicates.map((d) => (
            <li key={d.name}>
              <strong>{d.name}</strong>
              {d.entries.every((e) => e.active) && (
                <small>
                  Ses poules et ses matchs ne peuvent pas être importés tant qu’une inscription n’est pas retenue.
                </small>
              )}
              <div className="admin-review-actions">
                {d.entries.map((e) => (
                  <button
                    key={e.id}
                    className={e.active && !d.entries.every((x) => x.active) ? '' : 'button-secondary'}
                    disabled={busy || (e.active && !d.entries.every((x) => x.active))}
                    onClick={() =>
                      act(
                        `Retenir l’inscription ${e.entryRanking ? `classée ${e.entryRanking}` : 'sans classement'} de ${d.name} ?`,
                        () => API.post(`/admin/reviews/duplicates/${competitionId}/keep`, { entryId: e.id }),
                        () =>
                          `${d.name} : inscription retenue. Ses poules et matchs seront importés au prochain contrôle.`,
                      )
                    }
                  >
                    {e.entryRanking ? `Classée ${e.entryRanking}` : 'Sans classement'} · {e.country || '—'}
                    {e.active && !d.entries.every((x) => x.active) ? ' · retenue' : ''}
                    {!e.active ? ' · écartée' : ''}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
