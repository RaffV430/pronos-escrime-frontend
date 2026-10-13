import { useEffect, useState } from 'react';
import { CACHE_EVENT } from '../lib/fieldCache';
import { MODE_EVENT, applyMode, detector, lowConnectionReason, setDataMode } from '../lib/connectionQuality';
import { OUTBOX_EVENT, flush, pending } from '../lib/outbox';

const time = (at) => new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Bandeau d'état du réseau : hors ligne, mode connexion faible (automatique ou choisi) et pronostics
// en attente d'envoi.
export default function ConnectionStatus({ compact = false }) {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [checkedAt, setCheckedAt] = useState(null);
  const [reason, setReason] = useState(lowConnectionReason);
  const [waiting, setWaiting] = useState(() => pending().length);
  useEffect(() => {
    const update = (event) => {
      if (event.detail?.offline) {
        setOffline(true);
        setCheckedAt(event.detail.checkedAt);
      } else if (event.detail?.checkedAt) {
        setOffline(false);
        setCheckedAt(event.detail.checkedAt);
      }
    };
    const online = () => setOffline(!navigator.onLine);
    const mode = () => setReason(lowConnectionReason());
    const outbox = () => setWaiting(pending().length);
    window.addEventListener(CACHE_EVENT, update);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    window.addEventListener(MODE_EVENT, mode);
    window.addEventListener(OUTBOX_EVENT, outbox);
    return () => {
      window.removeEventListener(CACHE_EVENT, update);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
      window.removeEventListener(MODE_EVENT, mode);
      window.removeEventListener(OUTBOX_EVENT, outbox);
    };
  }, []);
  if (!offline && !reason && !waiting) return null;
  if (compact)
    return (
      <details className="ux-connection" role="status">
        <summary
          aria-label={
            offline ? 'Hors connexion' : waiting ? `${waiting} pronostics en attente` : 'Mode connexion faible'
          }
          title={offline ? 'Hors connexion' : 'Connexion faible'}
        >
          ◔{waiting > 0 && <small>{waiting}</small>}
        </summary>
        <div>
          <p>
            {offline
              ? 'Hors connexion : les données restent disponibles sur cet appareil.'
              : 'Mode connexion faible : actualisation espacée et affichage allégé.'}
          </p>
          {waiting > 0 && <p>{waiting} pronostic(s) en attente d’envoi.</p>}
          {waiting > 0 && (
            <button className="button-link" onClick={flush}>
              Réessayer
            </button>
          )}
          {!offline && reason && (
            <button
              className="button-link"
              onClick={() => {
                detector?.reset();
                setDataMode('auto');
                applyMode();
              }}
            >
              Revenir en mode automatique
            </button>
          )}
        </div>
      </details>
    );
  return (
    <div className="connection-status" role="status">
      {offline ? (
        <p>
          Pas de réseau · données conservées{checkedAt ? `, reçues à ${time(checkedAt)}` : ''}. Vous pouvez continuer à
          pronostiquer : l’envoi se fera dès que le réseau revient.
        </p>
      ) : reason === 'auto' ? (
        <p>
          Connexion lente détectée · mode connexion faible activé : affichage allégé, actualisation espacée.{' '}
          <button
            className="button-link"
            onClick={() => {
              detector?.reset();
              applyMode();
            }}
          >
            Désactiver
          </button>
        </p>
      ) : reason === 'manual' ? (
        <p>
          Mode connexion faible · affichage allégé, actualisation espacée.{' '}
          <button className="button-link" onClick={() => setDataMode('auto')}>
            Désactiver
          </button>
        </p>
      ) : null}
      {waiting > 0 && (
        <p className="connection-outbox">
          {waiting > 1 ? `${waiting} pronostics en attente d’envoi` : '1 pronostic en attente d’envoi'} · nouvel essai
          automatique.{' '}
          <button className="button-link" onClick={flush}>
            Réessayer maintenant
          </button>
        </p>
      )}
    </div>
  );
}
