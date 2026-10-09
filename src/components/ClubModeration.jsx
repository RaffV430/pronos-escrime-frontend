import { useEffect, useState } from 'react';
import API from '../api';
const labels = {
  PENDING: 'En attente',
  APPROVED: 'Acceptée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée par un nouveau choix',
};
export default function ClubModeration() {
  const [rows, setRows] = useState([]),
    [policy, setPolicy] = useState(null),
    [terms, setTerms] = useState(''),
    [rules, setRules] = useState(''),
    [reasons, setReasons] = useState({}),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      API.get('/clubs/admin/requests', { signal: c.signal }),
      API.get('/clubs/admin/name-policy', { signal: c.signal }),
    ])
      .then(([r, p]) => {
        setRows(r.data);
        setPolicy(p.data);
        setTerms(p.data.terms.join('\n'));
        setRules(p.data.rules);
      })
      .catch(() => {
        if (!c.signal.aborted) setError('Demandes de clubs indisponibles.');
      });
    return () => c.abort();
  }, [revision]);
  async function run(action, success) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      setMessage(success);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e.response?.data?.error || 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  }
  async function importTerms(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250000) {
      setError('Fichier trop volumineux (250 Ko maximum).');
      return;
    }
    setTerms(await file.text());
    setMessage('Liste chargée pour relecture. Enregistrez les règles pour l’activer.');
    e.target.value = '';
  }
  return (
    <details className="feature-panel club-moderation">
      <summary>Demandes de nouveaux clubs et règles de nommage</summary>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={busy} onClick={() => setRevision((n) => n + 1)}>
        Actualiser
      </button>
      <h3>Demandes de clubs</h3>
      {!rows.length && <p>Aucune demande.</p>}
      {rows.map((r) => (
        <article className="feature-panel" key={r.id}>
          <strong>
            {r.name} · {r.city}
          </strong>
          <p>
            {r.shortName} · {r.user.name} · {labels[r.status]}
          </p>
          {r.reason && <p>Motif : {r.reason}</p>}
          {r.status === 'PENDING' && (
            <>
              <label>
                Motif en cas de refus
                <textarea
                  maxLength={1000}
                  value={reasons[r.id] || ''}
                  onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}
                />
              </label>
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    () => API.put(`/clubs/admin/requests/${r.id}`, { status: 'APPROVED' }),
                    'Club accepté et compte rattaché au groupe du club.',
                  )
                }
              >
                Accepter et rattacher
              </button>
              <button
                disabled={busy || (reasons[r.id] || '').trim().length < 5}
                onClick={() =>
                  run(
                    () => API.put(`/clubs/admin/requests/${r.id}`, { status: 'REJECTED', reason: reasons[r.id] }),
                    'Demande refusée. E-mail mis en attente d’envoi.',
                  )
                }
              >
                Refuser
              </button>
            </>
          )}
          {r.status === 'REJECTED' && (
            <p>
              E-mail :{' '}
              {{
                PENDING: 'en attente',
                SENDING: 'en cours',
                SENT: 'envoyé',
                FAILED: 'échec après plusieurs tentatives',
              }[r.mailStatus] || 'en attente'}
              {r.mailStatus === 'FAILED' && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() => API.post(`/clubs/admin/requests/${r.id}/retry-mail`), 'Nouvelle tentative programmée.')
                  }
                >
                  Réessayer l’e-mail
                </button>
              )}
            </p>
          )}
        </article>
      ))}
      <h3>Règles publiées et mots interdits</h3>
      <p>
        Le contrôle s’applique automatiquement aux nouvelles demandes et à leur acceptation. Les demandes existantes ne
        sont pas refusées rétroactivement. Un mot est recherché entier, sans distinction de casse ni d’accent.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              API.put('/clubs/admin/name-policy', {
                revision: policy.revision,
                terms: terms
                  .split(/\r?\n/)
                  .map((t) => t.trim())
                  .filter(Boolean),
                rules,
              }),
            'Règles publiées et contrôle automatique mis à jour.',
          );
        }}
      >
        <label>
          Règles affichées sur le site
          <textarea required minLength={20} maxLength={5000} value={rules} onChange={(e) => setRules(e.target.value)} />
        </label>
        <label>
          Mots ou expressions interdits (un par ligne, 2 000 maximum)
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} />
        </label>
        <label>
          Importer une liste de texte
          <input disabled={busy} type="file" accept=".txt,text/plain" onChange={importTerms} />
        </label>
        <button disabled={busy || !policy}>Enregistrer les règles et la liste</button>
      </form>
    </details>
  );
}
