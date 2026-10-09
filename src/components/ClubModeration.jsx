import { pollWhileVisible } from '../lib/polling';
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
    const stop = pollWhileVisible(
      () =>
        API.get('/clubs/admin/requests', { signal: c.signal })
          .then(({ data }) => setRows(data))
          .catch(() => {
            if (!c.signal.aborted) setError('Actualisation des demandes indisponible. Réessayez.');
          }),
      30000,
    );
    return () => {
      c.abort();
      stop();
    };
  }, []);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      API.get('/clubs/admin/requests', { signal: c.signal }),
      API.get('/clubs/admin/name-policy', { signal: c.signal }),
    ])
      .then(([r, p]) => {
        setRows(r.data);
        setPolicy(p.data);
        setTerms(
          'terme;categorie;action\n' +
            p.data.terms
              .map((value) => {
                const entry =
                  typeof value === 'string' ? { terme: value, categorie: 'regles_nommage', action: 'bloquer' } : value;
                return [entry.terme, entry.categorie, entry.action]
                  .map((v) => '"' + v.replaceAll('"', '""') + '"')
                  .join(';');
              })
              .join('\n'),
        );
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
    if (file.size > 40000) {
      setError('Fichier trop volumineux (40 Ko maximum).');
      return;
    }
    setTerms(await file.text());
    setMessage('Liste chargée pour relecture. Enregistrez les règles pour l’activer.');
    e.target.value = '';
  }
  return (
    <details className="feature-panel club-moderation">
      <summary>
        Clubs ajoutés à vérifier · {rows.filter((r) => r.status === 'PENDING').length} demande(s) en attente
      </summary>
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
              <p>
                Alerte administrateur :{' '}
                {{
                  PENDING: 'en attente d’envoi',
                  SENDING: 'en cours d’envoi',
                  SENT: 'envoyée',
                  FAILED: 'échec après plusieurs tentatives',
                }[r.adminAlertStatus] || 'en attente d’envoi'}
                .
              </p>
              {r.adminAlertStatus === 'FAILED' && (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => API.post(`/clubs/admin/requests/${r.id}/retry-alert`),
                      'Alerte remise en attente d’envoi.',
                    )
                  }
                >
                  Réessayer l’alerte
                </button>
              )}
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
        « bloquer » refuse une correspondance exacte et programme un e-mail motivé. « revoir » et les ressemblances
        fortes restent en attente de validation administrative. Les termes courts et codes numériques ne font pas
        l’objet d’une recherche approximative. Les demandes existantes ne sont pas refusées rétroactivement.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              API.put('/clubs/admin/name-policy', {
                revision: policy.revision,
                csv: terms,
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
          Liste de modération CSV : terme;categorie;action (2 000 lignes maximum)
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} />
        </label>
        <label>
          Importer une liste CSV
          <input disabled={busy} type="file" accept=".csv,text/csv" onChange={importTerms} />
        </label>
        <button disabled={busy || !policy}>Enregistrer les règles et la liste</button>
      </form>
    </details>
  );
}
