import { useEffect, useState } from 'react';
import API from '../api';
import { calendarDates, calendarCategories, calendarFormat, GENDERS, monthLabel } from '../lib/calendar';

// Prochaines épreuves du calendrier (sélection FFE) : dates, lieu, hommes / dames, catégories.
// Une épreuve déjà suivie par l'application renvoie vers sa page.
export default function UpcomingCalendar({
  limit = null,
  title = 'Prochaines épreuves',
  headingLevel = 2,
  footer = null,
}) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    API.get('/public/calendar', { signal: c.signal })
      .then(({ data }) => setEvents(Array.isArray(data?.events) ? data.events : []))
      .catch(() => !c.signal.aborted && setError('Calendrier indisponible pour le moment.'));
    return () => c.abort();
  }, []);
  const H = `h${headingLevel}`;
  const shown = limit ? events?.slice(0, limit) : events;
  const months = [];
  for (const e of shown || []) {
    const m = monthLabel(e.start);
    if (months.at(-1)?.label !== m) months.push({ label: m, events: [] });
    months.at(-1).events.push(e);
  }
  return (
    <section className="calendar" aria-label={title}>
      <H className="calendar-title">{title}</H>
      {error && <p className="muted">{error}</p>}
      {!events && !error && <p className="muted">Chargement du calendrier…</p>}
      {events?.length === 0 && <p className="muted">Aucune épreuve à venir dans le calendrier.</p>}
      {months.map((m) => (
        <div key={m.label} className="calendar-month">
          {!limit && <h3>{m.label}</h3>}
          <ul>
            {m.events.map((e) => {
              const g = GENDERS[e.gender];
              return (
                <li key={e.id} className="calendar-event">
                  <span className="calendar-date">{calendarDates(e.start, e.end)}</span>
                  <span className="calendar-what">
                    <strong>{e.city || 'Lieu à préciser'}</strong>
                    <span className="muted">{e.label}</span>
                    <span className="calendar-tags">
                      {g && (
                        <span className={`calendar-tag sex-${e.gender}`} title={g.label}>
                          <span aria-hidden="true">{g.icon}</span> {g.short}
                        </span>
                      )}
                      {calendarCategories(e.categories).map((c) => (
                        <span key={c} className="calendar-tag">
                          {c}
                        </span>
                      ))}
                      <span className="calendar-tag">{calendarFormat(e.format)}</span>
                    </span>
                  </span>
                  {e.tournamentId && (
                    <a className="calendar-live" href={`/tournoi/${e.tournamentId}`}>
                      Sur l’appli
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {footer}
    </section>
  );
}
