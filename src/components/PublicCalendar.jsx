import { useEffect } from 'react';
import PublicHeader from './PublicHeader';
import UpcomingCalendar from './UpcomingCalendar';
import { LegalLinks } from './LegalPages';

// Calendrier des prochaines épreuves de fleuret (/calendrier), lisible sans compte.
export default function PublicCalendar() {
  useEffect(() => {
    document.title = 'Calendrier des épreuves de fleuret · Pronos Escrime';
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        'Calendrier 2026-2027 des épreuves de fleuret : nationales, internationales et championnats, seniors, juniors et cadets, hommes et dames.',
      );
  }, []);
  return (
    <div className="app-shell redesigned public-page">
      <PublicHeader current="calendar" />
      <main className="feature-panel">
        <h1>Calendrier des épreuves de fleuret</h1>
        <p className="muted">
          Saison 2026-2027, d’après le calendrier de la Fédération française d’escrime. Les épreuves arrivent dans
          l’application dès leur publication sur les sites officiels de suivi.
        </p>
        <UpcomingCalendar title="Épreuves à venir" headingLevel={2} />
      </main>
      <footer className="site-footer">
        <LegalLinks />
      </footer>
    </div>
  );
}
