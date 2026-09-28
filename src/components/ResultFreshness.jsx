import { useEffect, useState } from 'react';
import API from '../api';
export default function ResultFreshness({ competitionId, children }) {
  const [data, setData] = useState(null),
    [failed, setFailed] = useState(false),
    [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    const read = () => {
      setNow(Date.now());
      API.get(`/matches/freshness/${competitionId}`, { signal: c.signal })
        .then((r) => {
          setData(r.data);
          setFailed(false);
        })
        .catch(() => {
          if (!c.signal.aborted) setFailed(true);
        });
    };
    read();
    const timer = setInterval(read, 30000);
    return () => {
      c.abort();
      clearInterval(timer);
    };
  }, [competitionId]);
  const label = failed
    ? 'Vérification indisponible'
    : {
        COMPLETE: 'Résultats finalisés',
        RUNNING: 'Contrôle en cours',
        DELAYED: 'Synchronisation à vérifier',
        SCHEDULED: 'Épreuve à venir',
        CURRENT: 'Dernier contrôle réussi',
        UNKNOWN: 'En attente du premier contrôle',
      }[data?.state] || 'Lecture du suivi…';
  const minutes = data?.checkedAt ? Math.max(0, Math.floor((now - Date.parse(data.checkedAt)) / 60000)) : null;
  return (
    <details
      className={`result-freshness freshness-compact ${failed || data?.state === 'DELAYED' ? 'is-delayed' : ''}`}
      aria-label="Fraîcheur des résultats"
    >
      <summary>
        <span aria-hidden="true">●</span>{' '}
        {failed
          ? 'Vérification indisponible'
          : data?.state === 'DELAYED'
            ? 'Suivi à vérifier'
            : data?.state === 'COMPLETE'
              ? 'Résultats finalisés'
              : minutes !== null
                ? `Vérifié ${minutes < 1 ? 'à l’instant' : `il y a ${minutes} min`}`
                : label}
        <span className="freshness-details">Détails</span>
      </summary>
      <div className="freshness-content">
        <strong>{label}</strong>
        {data?.checkedAt && <p>Dernière vérification : {new Date(data.checkedAt).toLocaleString('fr-FR')}</p>}
        {data?.state !== 'COMPLETE' && data?.nextAt && (
          <p>Prochain contrôle prévu : {new Date(data.nextAt).toLocaleString('fr-FR')}</p>
        )}
        {children}
      </div>
    </details>
  );
}
