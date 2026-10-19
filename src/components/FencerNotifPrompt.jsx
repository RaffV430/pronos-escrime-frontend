import { useEffect, useState } from 'react';
import API from '../api';
import { FOCUS_KEY, FOLLOWED_EVENT, dismissPrompt, fencerAlertsOn, promptAllowed } from '../lib/fencerNotifPrompt';

// Après l'ajout d'un tireur suivi : proposer les notifications « Mes tireurs » si elles sont désactivées.
export default function FencerNotifPrompt({ userId, onOpenSettings }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    const followed = async () => {
      if (!promptAllowed(userId) || typeof Notification === 'undefined') return;
      try {
        const { data } = await API.get('/notifications/settings', { forceRefresh: true });
        if (alive && !fencerAlertsOn(data?.preferences)) setOpen(true);
      } catch {
        /* réglages illisibles : pas d'invitation */
      }
    };
    window.addEventListener(FOLLOWED_EVENT, followed);
    return () => {
      alive = false;
      window.removeEventListener(FOLLOWED_EVENT, followed);
    };
  }, [userId]);
  if (!open) return null;
  const later = () => {
    dismissPrompt(userId);
    setOpen(false);
  };
  return (
    <aside className="ux-install-suggestion fencer-notif-prompt" aria-label="Notifications de mes tireurs">
      <button className="button-link" aria-label="Fermer" onClick={later}>
        ×
      </button>
      <strong>Être prévenu pour vos tireurs ?</strong>
      <p>
        Une notification quand l’un d’eux est engagé dans une épreuve, puis à chacun de ses résultats (match terminé,
        bilan de poule).
      </p>
      <button
        onClick={() => {
          try {
            sessionStorage.setItem(FOCUS_KEY, 'fencers');
          } catch {
            /* le panneau s'ouvrira sans présélection */
          }
          setOpen(false);
          onOpenSettings();
        }}
      >
        Activer
      </button>{' '}
      <button className="button-link" onClick={later}>
        Plus tard
      </button>
    </aside>
  );
}
