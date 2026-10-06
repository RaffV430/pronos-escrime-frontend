import BrandMark from './BrandMark';

const hasSession = () => {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
};

// En-tête des pages sans compte (accueil, calendrier, résultats, tournoi) : logo, liens, connexion.
export default function PublicHeader({ current = null, onLogin = null }) {
  return (
    <header className="public-header">
      <a className="brand" href="/" aria-label="Pronos Escrime, accueil">
        <BrandMark />
        pronos<span>escrime</span>
      </a>
      <nav className="public-nav" aria-label="Navigation">
        <a href="/calendrier" aria-current={current === 'calendar' ? 'page' : undefined}>
          Calendrier
        </a>
        <a href="/resultats" aria-current={current === 'results' ? 'page' : undefined}>
          Résultats
        </a>
        {hasSession() ? (
          <a className="button-link-strong" href="/pronostiquer">
            Ouvrir l’appli
          </a>
        ) : onLogin ? (
          <button type="button" className="button-secondary" onClick={onLogin}>
            Se connecter
          </button>
        ) : (
          <a className="button-link-strong" href="/#connexion">
            Se connecter
          </a>
        )}
      </nav>
    </header>
  );
}
