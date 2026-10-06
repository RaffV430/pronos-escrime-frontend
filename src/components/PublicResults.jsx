import { useEffect } from 'react';
import PublicHeader from './PublicHeader';
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
      <PublicHeader current="results" />
      <PublicMode.Provider value={true}>
        <Results />
      </PublicMode.Provider>
      <footer className="site-footer">
        <LegalLinks />
      </footer>
    </div>
  );
}
