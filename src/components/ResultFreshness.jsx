import { useFreshness } from '../lib/useResultSync';
import { useNow } from '../lib/polling';
export default function ResultFreshness({ competitionId, children }) {
  // Lit le veilleur partagé de l'épreuve au lieu d'interroger le serveur une seconde fois.
  const { data, failed } = useFreshness(competitionId);
  const now = useNow(30000);
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
        {data?.publishedAt && (
          <p>Dernière publication du site officiel : {new Date(data.publishedAt).toLocaleString('fr-FR')}</p>
        )}
        {data?.state !== 'COMPLETE' && data?.nextAt && (
          <p>Prochain contrôle prévu : {new Date(data.nextAt).toLocaleString('fr-FR')}</p>
        )}
        {children}
      </div>
    </details>
  );
}
