import { useCallback, useEffect, useState } from 'react';
import API from '../api';

const LEVELS = {
  error: { icon: '❌', label: 'En panne' },
  warning: { icon: '⚠️', label: 'À surveiller' },
  ok: { icon: '✅', label: 'À jour' },
  waiting: { icon: '⏳', label: 'Pas encore contrôlée' },
};
const ago = (date, now) => {
  if (!date) return '—';
  const min = Math.round((now - Date.parse(date)) / 60000);
  return min < 1 ? 'à l’instant' : min < 60 ? `il y a ${min} min` : new Date(date).toLocaleString('fr-FR');
};
const inText = (date, now) => {
  if (!date) return '—';
  const min = Math.round((Date.parse(date) - now) / 60000);
  return min <= 0 ? 'en retard' : min < 60 ? `dans ${min} min` : new Date(date).toLocaleString('fr-FR');
};

// État du suivi FencingTimeLive de toutes les épreuves en cours : une panne se voit au premier coup d'œil.
export default function SyncHealth() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0); // heure du serveur au moment de la lecture
  const load = useCallback(
    (signal) =>
      API.get('/admin/sync-health', { signal })
        .then((r) => {
          setData(r.data);
          setNow(Date.parse(r.data.checkedAt) || 0);
          setError('');
        })
        .catch((e) => {
          if (!signal?.aborted) setError(e.response?.data?.error || 'État du suivi indisponible.');
        }),
    [],
  );
  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    const timer = setInterval(() => load(c.signal), 60000);
    return () => {
      c.abort();
      clearInterval(timer);
    };
  }, [load]);
  const s = data?.summary;
  const open = Boolean(s && (s.error || s.warning)) || data?.workerEnabled === false;
  return (
    <details className={`feature-panel sync-health ${s?.error ? 'has-error' : ''}`} open={open}>
      <summary>
        Suivi FencingTimeLive{' '}
        {s && (
          <span className="sync-health-summary">
            {s.error > 0 && `❌ ${s.error} en panne · `}
            {s.warning > 0 && `⚠️ ${s.warning} à surveiller · `}✅ {s.ok} à jour
          </span>
        )}
      </summary>
      {error && <p role="alert">{error}</p>}
      {data?.workerEnabled === false && (
        <p role="alert">
          Le suivi automatique est désactivé sur le serveur (FTL_AUTO_SYNC). Seuls les contrôles manuels ont lieu.
        </p>
      )}
      {data && !data.competitions?.length && <p>Aucune épreuve suivie en ce moment.</p>}
      {data?.competitions?.length > 0 && (
        <div className="sync-health-scroll">
          <table className="sync-health-table">
            <thead>
              <tr>
                <th scope="col">Épreuve</th>
                <th scope="col">État</th>
                <th scope="col">Dernier contrôle</th>
                <th scope="col">Prochain</th>
              </tr>
            </thead>
            <tbody>
              {data.competitions.map((c) => (
                <tr key={c.competitionId} className={`level-${c.level}`}>
                  <th scope="row">
                    {c.competition}
                    {c.tournament && <small> · {c.tournament}</small>}
                  </th>
                  <td>
                    <span aria-hidden="true">{LEVELS[c.level].icon}</span> {LEVELS[c.level].label}
                    {c.failures > 0 && (
                      <small>
                        {' '}
                        · {c.failures} échec{c.failures > 1 ? 's' : ''}
                      </small>
                    )}
                    {c.lastError && <small className="sync-health-error">{c.lastError}</small>}
                  </td>
                  <td>{ago(c.lastFinishedAt, now)}</td>
                  <td>{c.status === 'COMPLETE' ? 'Terminé' : inText(c.nextAutomaticAt, now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted">
        En cas de panne (3 échecs d’affilée), les administrateurs sont prévenus par e-mail et notification, puis au
        rétablissement.
      </p>
    </details>
  );
}
