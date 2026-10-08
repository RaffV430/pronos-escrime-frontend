import { eventNameFr } from '../lib/eventName';
import { nextEventStart } from '../lib/eventCountdown';
import { useNow } from '../lib/polling';
import { PisteCountdown } from './PisteExperience';
import { useEffect, useState } from 'react';
import API from '../api';
import PublicHeader from './PublicHeader';
import InvitationBanner from './InvitationBanner';
import UpcomingCalendar from './UpcomingCalendar';
import { MEDALS, cityName, countryName, dateRange, flag } from './eventResults';
import { publicPath } from '../lib/routes';
import { authPath, isAuthPath } from '../lib/authNavigation';

const where = (t) =>
  [
    t.start && dateRange(t.start, t.end),
    cityName(t.city),
    (t.countries || []).map((c) => `${flag(c)} ${countryName(c)}`.trim()).join(' · '),
  ]
    .filter(Boolean)
    .join(' · ');

// Accueil sans compte : deux portes d'entrée (le jeu et les résultats), aperçu des derniers résultats,
// Connexion et inscription disposent de leur propre page.
export default function Landing({ children, invitation = null, onInvitationInvalid }) {
  const now = useNow(1000);
  const authOnly = isAuthPath(location.pathname);
  const [results, setResults] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  useEffect(() => {
    if (authOnly) return;
    const c = new AbortController();
    API.get('/public/results', { signal: c.signal })
      .then(({ data }) => setResults(Array.isArray(data) ? data : []))
      .catch(() => setResults([]));
    API.get('/public/tournaments', { signal: c.signal })
      .then(({ data }) => setTournaments(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => c.abort();
  }, [authOnly]);
  const nextStart = nextEventStart(tournaments, now);
  const nextTournament = tournaments.find(t => t.competitions?.some(c => c.startsAt === nextStart));
  const latest = results?.[0];
  const others = tournaments.filter((t) => t.id !== latest?.id).slice(0, 5);
  const openAuth = (register) => location.assign(authPath(register, location.search));
  const invite = invitation && (
    <InvitationBanner
      code={invitation}
      onRegister={() => openAuth(true)}
      onLogin={() => openAuth(false)}
      onInvalid={onInvitationInvalid}
    />
  );
  if (authOnly)
    return (
      <div className="landing-page">
        <PublicHeader />
        <main
          className="dedicated-auth"
          aria-label={location.pathname.startsWith('/inscription') ? 'Inscription' : 'Connexion'}
        >
          <a className="auth-back" href="/">
            ← Retour à l’accueil
          </a>
          {invite}
          {children}
        </main>
      </div>
    );
  return (
    <div className="landing-page">
      <PublicHeader onLogin={() => openAuth(false)} />
      <div className="landing">
        {invite}
        <section className="landing-hero" aria-labelledby="landing-title">
          <h1 id="landing-title">Pronostics d’escrime entre passionnés</h1>
          <p className="landing-lead">
            Pronostiquez les tableaux, les poules et les podiums des compétitions d’escrime, au fleuret, à l’épée et au
            sabre, et défiez votre club au classement.
          </p>
          <PisteCountdown deadline={nextStart} label={`PROCHAINE ÉPREUVE${nextTournament ? ` · ${nextTournament.name}` : ''}`} />
          <p className="landing-ctas">
            <button type="button" onClick={() => openAuth(true)}>
              Créer un compte
            </button>
            <a className="button-link-strong landing-cta-secondary" href="/resultats">
              Voir les résultats
            </a>
          </p>
        </section>

        {latest && (
          <section className="landing-preview" aria-labelledby="landing-preview-title">
            <p className="eyebrow" id="landing-preview-title">
              DERNIERS RÉSULTATS
            </p>
            <h2>
              <a href={publicPath(latest)}>{latest.name}</a>
            </h2>
            <p className="muted">{where(latest)}</p>
            <ul className="landing-winners">
              {latest.competitions.map((c) => {
                const gold = c.podium.find((p) => p.place === 1);
                return (
                  <li key={c.id}>
                    <span className="landing-event">{eventNameFr(c.name)}</span>
                    {gold ? (
                      <span>
                        <span aria-label="Vainqueur">{MEDALS[1]}</span> <strong>{gold.name}</strong>
                        {gold.country && <small className="muted"> {gold.country}</small>}
                      </span>
                    ) : (
                      <span className="muted">Podium à venir</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="landing-preview-links">
              <a href={publicPath(latest)}>Tableaux et classement de ce tournoi</a>
              <a className="landing-all" href="/resultats">
                Voir tous les résultats →
              </a>
            </p>
            {others.length > 0 && (
              <>
                <h3>Autres tournois</h3>
                <ul className="landing-tournaments">
                  {others.map((t) => (
                    <li key={t.id}>
                      <a href={publicPath(t)}>{t.name}</a>
                      <small>{where(t)}</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <div className="landing-preview landing-calendar">
          <UpcomingCalendar
            limit={6}
            title="Prochaines épreuves"
            footer={
              <p className="landing-preview-links">
                <a className="landing-all" href="/calendrier">
                  Tout le calendrier →
                </a>
              </p>
            }
          />
        </div>

        <section className="landing-more" aria-labelledby="landing-more-title">
          <h2 id="landing-more-title">Le jeu en bref</h2>
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
              parcours de chaque tireur, consultables sans compte.
            </li>
            <li>
              <strong>Notifications</strong> quand de nouveaux matchs s’ouvrent et avant la clôture des pronostics.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
