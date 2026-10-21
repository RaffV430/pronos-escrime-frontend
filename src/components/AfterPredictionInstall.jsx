import { useEffect, useState } from 'react';
import InstallApp from './InstallApp';
import { UX_SAVE } from '../lib/uxFeatures';
import {
  INSTALL_REMINDER_KEY,
  INSTALL_SNOOZE_MS,
  installationGuide,
  installationInstalled,
  maySuggestInstallation,
} from '../lib/installGuide';
export default function AfterPredictionInstall() {
  const [open, setOpen] = useState(false),
    [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    let timer,
      dismissed = false,
      dueAt = Date.now() + 20000;
    const show = () => {
      if (dismissed) return;
      let until = 0;
      try {
        until = localStorage.getItem(INSTALL_REMINDER_KEY) || 0;
      } catch {
        /* non-essential preference */
      }
      if (
        !maySuggestInstallation({
          device: installationGuide(navigator).device,
          installed: installationInstalled({
            standalone: navigator.standalone,
            displayMode: matchMedia('(display-mode: standalone)').matches,
          }),
          hidden: document.hidden,
          snoozedUntil: until,
        })
      )
        return;
      // In-flow invitation; never steal focus or interrupt an input/dialog.
      if (
        document.activeElement?.matches('input, textarea, select, [contenteditable="true"]') ||
        document.querySelector('[role="dialog"], dialog[open]')
      ) {
        timer = setTimeout(show, 10000);
        return;
      }
      setOpen(true);
    };
    const saved = () => {
      dueAt = Date.now() + 6000;
      clearTimeout(timer);
      timer = setTimeout(show, 6000);
    };
    const done = () => {
      dismissed = true;
      setOpen(false);
      clearTimeout(timer);
    };
    timer = setTimeout(show, 20000);
    const visible = () => {
      if (!document.hidden && Date.now() >= dueAt) show();
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener(UX_SAVE, saved);
    window.addEventListener('appinstalled', done);
    const dismiss = () => {
      dismissed = true;
      clearTimeout(timer);
    };
    window.addEventListener('pronos:install-snoozed', dismiss);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener(UX_SAVE, saved);
      window.removeEventListener('appinstalled', done);
      window.removeEventListener('pronos:install-snoozed', dismiss);
    };
  }, []);
  const later = () => {
    try {
      localStorage.setItem(INSTALL_REMINDER_KEY, String(Date.now() + INSTALL_SNOOZE_MS));
    } catch {
      /* current session still dismissed */
    }
    window.dispatchEvent(new Event('pronos:install-snoozed'));
    setOpen(false);
  };
  return (
    <aside className="install-invitation" hidden={!open} aria-label="Retrouver Pronos Escrime facilement">
      <div className="install-invitation-heading">
        <img src="/app-icon-192.png" width="40" height="40" alt="" />
        <div>
          <strong>Gardez Pronos Escrime à portée de main</strong>
          <p>Ajoutez l’icône sur votre écran d’accueil pour retrouver vos compétitions.</p>
        </div>
      </div>
      <div className="install-invitation-actions">
        <button type="button" aria-expanded={guideOpen} onClick={() => setGuideOpen(!guideOpen)}>
          {guideOpen ? 'Masquer les étapes' : 'Ajouter à mon écran d’accueil'}
        </button>
        <button type="button" className="button-link" onClick={later}>
          Plus tard
        </button>
      </div>
      <div hidden={!guideOpen}>
        <InstallApp expanded />
      </div>
    </aside>
  );
}
