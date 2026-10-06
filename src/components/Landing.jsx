import { useEffect, useState } from 'react';
import API from '../api';
import BrandMark from './BrandMark';
import { cityName, countryName, dateRange, flag } from './eventResults';

// Accueil sans compte : présentation du jeu (lisible par les moteurs de recherche) et derniers tournois
// publics, à côté du formulaire de connexion.
export default function Landing({ children }) {
  const [tournaments, setTournaments] = useState([]);
  useEffect(() => {
    const c = new AbortController();
    API.get('/public/tournaments', { signal: c.signal })
      .then(({ data }) => setTournaments(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => c.abort();
  }, []);
  return (
    <div className="landing">
      <section className="landing-intro" aria-labelledby="landing-title">
        <p className="landing-brand">
          <BrandMark />
          <span>
            <strong>pronos</strong> escrime
          </span>
        </p>
        <h1 id="landing-title">Pronostics d’escrime entre passionnés</h1>
        <p className="landing-lead">
          Pronostiquez les tableaux, les poules et les podiums des compétitions d’escrime, au fleuret, à l’épée et au
          sabre, et défiez votre club au classement.
        </p>
      </section>
      <div className="landing-card">{children}</div>
      <section className="landing-more" aria-label="Le jeu en bref">
        <ul className="landing-points">
          <li>
            <strong>Tableaux et poules en direct</strong> : scores importés de FencingTimeLive et d’engarde-service,
            points calculés dès la publication des résultats.
          </li>
          <li>
            <strong>Classements</strong> par épreuve, par tournoi, sur la saison et entre membres d’un même club.
          </li>
          <li>
            <strong>Résultats et fiches tireurs</strong> : podiums, tableaux complets, tous les assauts de poule et le
            parcours de chaque tireur.
          </li>
          <li>
            <strong>Notifications</strong> quand de nouveaux matchs s’ouvrent et avant la clôture des pronostics.
          </li>
        </ul>
        <p className="landing-results">
          <a href="/resultats">Consulter les résultats des compétitions</a> : podiums, tableaux et poules, sans compte.
        </p>
        {tournaments.length > 0 && (
          <section className="landing-tournaments" aria-labelledby="landing-tournaments-title">
            <h2 id="landing-tournaments-title">Derniers tournois</h2>
            <ul>
              {tournaments.map((t) => (
                <li key={t.id}>
                  <a href={`/tournoi/${t.id}`}>{t.name}</a>
                  <small>
                    {[
                      t.start && dateRange(t.start, t.end),
                      cityName(t.city),
                      t.countries.map((c) => `${flag(c)} ${countryName(c)}`.trim()).join(' · '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </div>
  );
}
