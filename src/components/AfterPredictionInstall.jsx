import { useEffect, useState } from 'react';
import InstallApp from './InstallApp';
import { UX_SAVE } from '../lib/uxFeatures';
export default function AfterPredictionInstall({ userId }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = `pronos:install-suggestion:${userId}`;
    const saved = () => {
      if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, '1');
      } catch {
        /* suggestion uniquement pour cette session */
      }
      setOpen(true);
    };
    window.addEventListener(UX_SAVE, saved);
    return () => window.removeEventListener(UX_SAVE, saved);
  }, [userId]);
  if (!open) return null;
  return (
    <aside className="ux-install-suggestion" aria-label="Installer Pronos Escrime">
      <button className="button-link" aria-label="Fermer la suggestion" onClick={() => setOpen(false)}>
        ×
      </button>
      <strong>Votre premier pronostic est enregistré.</strong>
      <p>Gardez l’app à portée de main et activez les notifications depuis Mon compte.</p>
      <InstallApp />
      <button className="button-link" onClick={() => setOpen(false)}>
        Plus tard
      </button>
    </aside>
  );
}
