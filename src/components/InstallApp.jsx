import { useEffect, useState } from 'react';
import { installationGuide, installationInstalled } from '../lib/installGuide';
const consumed = 'pronos:install-prompt-consumed';
export function InstallationHelp({ guide }) {
  return (
    <div className="install-guide">
      <strong>{guide.title}</strong>
      <p>{guide.intro}</p>
      <ol>
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <small>{guide.extra}</small>
    </div>
  );
}
export default function InstallApp({ expanded = false, onInstalled }) {
  const [prompt, setPrompt] = useState(null),
    [offline, setOffline] = useState(() => !navigator.onLine),
    [installed, setInstalled] = useState(() =>
      installationInstalled({
        displayMode: matchMedia('(display-mode: standalone)').matches,
        standalone: navigator.standalone,
      }),
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const guide = installationGuide(navigator);
  useEffect(() => {
    const media = matchMedia('(display-mode: standalone)');
    const install = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
      onInstalled?.();
    };
    const changed = () => {
      if (media.matches || navigator.standalone) done();
    };
    const clear = () => setPrompt(null);
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('appinstalled', done);
    window.addEventListener(consumed, clear);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    media.addEventListener?.('change', changed);
    return () => {
      window.removeEventListener('beforeinstallprompt', install);
      window.removeEventListener('appinstalled', done);
      window.removeEventListener(consumed, clear);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
      media.removeEventListener?.('change', changed);
    };
  }, [onInstalled]);
  const install = async () => {
    if (!prompt || busy) return;
    const request = prompt;
    setBusy(true);
    window.dispatchEvent(new Event(consumed));
    try {
      await request.prompt();
      const choice = await request.userChoice;
      setMessage(
        choice.outcome === 'accepted'
          ? 'Installation demandée. Retrouvez ensuite l’icône sur votre écran d’accueil.'
          : 'Vous pourrez réessayer depuis le menu du navigateur.',
      );
    } catch {
      setMessage('L’installation n’a pas pu démarrer. Suivez les étapes ci-dessous.');
    } finally {
      setBusy(false);
    }
  };
  const content = (
    <>
      {prompt && (
        <button type="button" disabled={busy} onClick={install}>
          Ajouter à mon écran d’accueil
        </button>
      )}
      {message && <p role="status">{message}</p>}
      <InstallationHelp guide={guide} />
      <p className="install-connection-note">
        Une connexion reste nécessaire pour les résultats et l’envoi des pronostics. L’installation n’active pas les
        notifications automatiquement.
      </p>
    </>
  );
  return (
    <>
      {offline && (
        <p className="draft-notice" role="alert">
          Vous êtes hors connexion. Reconnectez-vous pour vérifier les clôtures et enregistrer vos pronostics.
        </p>
      )}
      {!installed &&
        (expanded ? (
          <div className="install-app">{content}</div>
        ) : (
          <details className="install-app">
            <summary>Installer l’application sur cet appareil</summary>
            {content}
          </details>
        ))}
    </>
  );
}
