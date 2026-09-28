import { useEffect, useState } from 'react';
export default function InstallApp() {
  const [prompt, setPrompt] = useState(null),
    [offline, setOffline] = useState(() => !navigator.onLine),
    [installed, setInstalled] = useState(() => matchMedia('(display-mode: standalone)').matches);
  useEffect(() => {
    const install = (e) => {
        e.preventDefault();
        setPrompt(e);
      },
      done = () => {
        setInstalled(true);
        setPrompt(null);
      },
      online = () => setOffline(!navigator.onLine);
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('appinstalled', done);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    return () => {
      window.removeEventListener('beforeinstallprompt', install);
      window.removeEventListener('appinstalled', done);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
    };
  }, []);
  return (
    <>
      {offline && (
        <p className="draft-notice" role="alert">
          Vous êtes hors connexion. Reconnectez-vous pour vérifier les clôtures et enregistrer vos pronostics.
        </p>
      )}
      {!installed && (
        <details className="install-app">
          <summary>Installer l’application</summary>
          {prompt ? (
            <button
              onClick={async () => {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(null);
              }}
            >
              Ajouter à mon écran d’accueil
            </button>
          ) : (
            <p>
              Sur iPhone : Partager → Sur l’écran d’accueil. Sur Android ou ordinateur : menu du navigateur → Installer
              l’application.
            </p>
          )}
          <small>Une connexion reste nécessaire pour consulter les résultats et envoyer vos pronostics.</small>
        </details>
      )}
    </>
  );
}
