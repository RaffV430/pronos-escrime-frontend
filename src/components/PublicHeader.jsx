import BrandMark from './BrandMark';

// En-tête des pages sans compte (accueil, résultats, tournoi) : logo, Résultats, connexion.
export default function PublicHeader({ current = null, onLogin = null }) {
  return (
    <header className="public-header">
      <a className="brand" href="/" aria-label="Pronos Escrime, accueil">
        <BrandMark />
        pronos<span>escrime</span>
      </a>
      <nav className="public-nav" aria-label="Navigation">
        <a href="/resultats" aria-current={current === 'results' ? 'page' : undefined}>
          Résultats
        </a>
        {onLogin ? (
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
