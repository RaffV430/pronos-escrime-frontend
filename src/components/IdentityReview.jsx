import { useEffect, useState } from 'react';
import API from '../api';
export default function IdentityReview({ competitionId, onRefresh }) {
  const [data, setData] = useState(null),
    [reason, setReason] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setReason('');
    setMessage('');
    API.get(`/admin/identity-review/${competitionId}`, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((e) => {
        if (!controller.signal.aborted) setMessage(e.response?.data?.error || 'Impossible de charger les conflits.');
      });
    return () => controller.abort();
  }, [competitionId]);
  const review = data?.identityReview;
  async function confirm(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await API.post(`/admin/identity-review/${competitionId}/confirm`, { version: review.version, reason });
      setData({ ...data, identityReview: null });
      setReason('');
      setMessage('Confirmation enregistrée. Les identifiants et pronostics sont conservés.');
      await onRefresh();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Confirmation impossible. Actualisez et réessayez.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="feature-panel" aria-labelledby="identity-review-title">
      <h3 id="identity-review-title">Identités à vérifier</h3>
      {message && <p role="status">{message}</p>}
      {!data && !message && <p>Chargement…</p>}
      {data && !review && <p>Aucun conflit d’identité en attente pour cette épreuve.</p>}
      {review && (
        <>
          <p>
            Comparez la source officielle avant de confirmer qu’il s’agit des mêmes personnes. En cas d’homonymie ou de
            doute, laissez le dossier en attente : les autres rencontres peuvent continuer.
          </p>
          <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer">
            Consulter la liste officielle
          </a>
          {review.conflicts.map((pair) => (
            <article className="feature-panel" key={pair.current.id}>
              <strong>{pair.current.name}</strong>
              <p>
                Identité conservée : {pair.current.country || 'Non renseigné'} · ID {pair.current.id}
              </p>
              <p>
                Source officielle : {pair.observed.name} · {pair.observed.country || 'Non renseigné'}
              </p>
            </article>
          ))}
          <form onSubmit={confirm}>
            <label>
              Motif de confirmation
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={10}
                maxLength={1000}
                required
              />
            </label>
            <button disabled={busy || reason.trim().length < 10}>
              Confirmer les corrections pour ces mêmes personnes
            </button>
          </form>
          <p>Cette action est journalisée. Elle ne valide aucun score ni point en attente.</p>
        </>
      )}
    </section>
  );
}
