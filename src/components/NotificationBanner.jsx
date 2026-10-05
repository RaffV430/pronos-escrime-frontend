import { useEffect, useState } from 'react';
import API from '../api';
import { pushSupport, applicationKey } from '../lib/notifications';

const KEY = 'notification-banner-later';
const LATER = 14 * 86400000; // « Plus tard » : 14 jours sans redemander.

function postponed() {
  try {
    return Number(localStorage.getItem(KEY)) > Date.now();
  } catch {
    return false;
  }
}

// Bandeau d'activation des notifications en un clic, pour un joueur qui n'a aucun appareil abonné.
// Un joueur déjà abonné ailleurs (y compris via l'ancienne adresse de l'appli) ne le voit pas.
export default function NotificationBanner({ userId }) {
  const [state, setState] = useState('hidden'); // hidden | offer | busy | done | error
  const [message, setMessage] = useState('');
  const [publicKey, setPublicKey] = useState(null);

  useEffect(() => {
    if (!userId || pushSupport() || postponed() || Notification.permission === 'denied') return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (await reg?.pushManager?.getSubscription()) return;
        const [config, devices] = await Promise.all([
          API.get('/notifications/config'),
          API.get('/notifications/devices'),
        ]);
        if (cancelled || !config.data?.available || devices.data?.length) return;
        setPublicKey(config.data.publicKey);
        setState('offer');
      } catch {
        /* Bandeau facultatif : rien à afficher en cas d'erreur. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const activate = async () => {
    // Autorisation demandée pendant le clic, avant toute attente réseau (exigence iOS).
    const permission =
      Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission();
    setState('busy');
    try {
      if ((await permission) !== 'granted')
        throw Error('Autorisation refusée : vous pourrez l’accorder plus tard dans Mon compte → Notifications.');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const subscription =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(publicKey) }));
      await API.post('/notifications/subscribe', {
        subscription: subscription.toJSON(),
        tournamentIds: [],
        competitionIds: [],
        preferences: {
          followAll: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
        },
      });
      setMessage('Notifications activées : vous serez prévenu à l’ouverture des tours et avant chaque clôture.');
      setState('done');
    } catch (e) {
      setMessage(e.response?.data?.error || e.message || 'Activation impossible. Réessayez depuis Mon compte.');
      setState('error');
    }
  };
  const later = () => {
    try {
      localStorage.setItem(KEY, String(Date.now() + LATER));
    } catch {
      /* Sans stockage : le bandeau reviendra au prochain chargement. */
    }
    setState('hidden');
  };

  if (state === 'hidden') return null;
  return (
    <div className="notification-banner" role={state === 'offer' ? undefined : 'status'}>
      {state === 'offer' || state === 'busy' ? (
        <>
          <p>
            <span aria-hidden="true">🔔 </span>
            Ne ratez pas l’ouverture des tours : activez les notifications sur cet appareil.
          </p>
          <div>
            <button type="button" onClick={activate} disabled={state === 'busy'}>
              {state === 'busy' ? 'Activation…' : 'Activer'}
            </button>
            <button type="button" className="button-link" onClick={later} disabled={state === 'busy'}>
              Plus tard
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{message}</p>
          <button type="button" className="button-link" onClick={() => setState('hidden')}>
            Fermer
          </button>
        </>
      )}
    </div>
  );
}
