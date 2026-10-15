import { useCallback, useEffect, useState } from 'react';
import API from '../api';
function NameChoice({ sourceName, data, busy, onConfirm }) {
  const [entryId, setEntryId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm({ sourceName, entryId, reason, confirm: confirmed });
      }}
      className="feature-panel"
    >
      <h4>Nom FTL non reconnu : {sourceName}</h4>
      <label>
        Engagé correspondant dans cette épreuve
        <select
          required
          value={entryId}
          onChange={(e) => {
            setEntryId(e.target.value);
            setConfirmed(false);
          }}
          disabled={busy}
        >
          <option value="">Choisir après vérification de la source</option>
          {data.entries.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} · {e.country || 'Pays non renseigné'}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motif de la correspondance
        <textarea
          required
          minLength={10}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
        />
      </label>
      <label>
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={busy}
        />
        J’ai vérifié la source officielle : il s’agit du même tireur.
      </label>
      <button disabled={busy || !entryId || reason.trim().length < 10 || !confirmed}>
        Confirmer la correspondance pour cette épreuve
      </button>
    </form>
  );
}
export default function FtlNameReview({ competitionId }) {
  const [data, setData] = useState(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await API.get(`/admin/ftl-name-review/${competitionId}`);
    setData(r.data);
  }, [competitionId]);
  useEffect(() => {
    let active = true;
    API.get(`/admin/ftl-name-review/${competitionId}`)
      .then((r) => {
        if (active) setData(r.data);
      })
      .catch((e) => {
        if (active) setMessage(e.response?.data?.error || 'Dossier indisponible.');
      });
    return () => {
      active = false;
    };
  }, [competitionId]);
  async function run(method, input) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await API[method](
        `/admin/ftl-name-review/${competitionId}`,
        method === 'delete' ? { data: { ...input, version: data.version } } : { ...input, version: data.version },
      );
      await load();
      setMessage(
        method === 'delete'
          ? 'Correspondance retirée. Les rencontres et pronostics déjà importés sont conservés.'
          : 'Correspondance enregistrée. Le suivi automatique la vérifiera au prochain contrôle ; aucun résultat n’a été saisi manuellement.',
      );
    } catch (e) {
      setMessage(e.response?.data?.error || 'Correction impossible.');
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="feature-panel" aria-label="Corriger les noms FTL">
      <h3>Vérifier les noms de cette épreuve</h3>
      <p>
        Choisissez un engagé uniquement après comparaison avec la source officielle. Cette correspondance s’applique à
        cette épreuve ; elle ne renomme aucun tireur, ne recrée aucun pronostic et ne valide aucun score.
      </p>
      {message && <p role="status">{message}</p>}
      {data?.sourceUrl && (
        <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
          Consulter les engagés officiels
        </a>
      )}
      {!data && !message && <p>Chargement…</p>}
      {data?.unknownNames
        .filter((name) => !data.aliases.some((a) => a.sourceName === name))
        .map((name) => (
          <NameChoice
            key={`${data.version}:${name}`}
            sourceName={name}
            data={data}
            busy={busy}
            onConfirm={(input) => run('post', input)}
          />
        ))}
      {data && !data.unknownNames.length && (
        <p>
          Aucun nom non reconnu au dernier contrôle. Les autres avertissements restent à examiner dans les outils de
          l’épreuve.
        </p>
      )}
      {data?.aliases.length > 0 && (
        <>
          <h4>Correspondances enregistrées</h4>
          <ul>
            {data.aliases.map((a) => (
              <li key={a.sourceName}>
                {a.sourceName} → {a.entryName}{' '}
                <button
                  className="button-secondary"
                  disabled={busy}
                  onClick={() => run('delete', { sourceName: a.sourceName })}
                >
                  Retirer cette correspondance
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        className="button-secondary"
        disabled={busy}
        onClick={() => load().catch(() => setMessage('Actualisation impossible.'))}
      >
        Actualiser le dossier
      </button>
    </section>
  );
}
