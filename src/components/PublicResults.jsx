import { useEffect } from 'react';
import BrandMark from './BrandMark';
import Results from './Results';
import { LegalLinks } from './LegalPages';
import { PublicMode } from '../lib/publicMode';

// Onglet Résultats sans compte (/resultats) : podiums, tableaux, poules et fiches tireurs.
export default function PublicResults() {
  useEffect(() => {
    document.title = 'Résultats des compétitions d’escrime · Pronos Escrime';
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        'Résultats des compétitions d’escrime : podiums, tableaux, poules avec tous les assauts et parcours de chaque tireur, par saison et par pays.',
      );
  }, []);
  return (
    <div className="app-shell redesigned public-page">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Pronos Escrime, accueil">
          <BrandMark />
          pronos<span>escrime</span>
        </a>
        <a className="button-link public-cta" href="/">
          Pronostiquer avec nous
        </a>
      </header>
      <PublicMode.Provider value={true}>
        <Results />
      </PublicMode.Provider>
      <footer className="site-footer">
        <LegalLinks />
      </footer>
    </div>
  );
}
