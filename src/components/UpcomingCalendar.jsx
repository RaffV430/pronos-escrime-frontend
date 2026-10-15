import { useEffect, useState } from 'react';
import API from '../api';
import { filterCalendar, calendarWeapons, calendarDates, calendarCategories, calendarFormat, calendarLink, GENDERS, monthLabel } from '../lib/calendar';
import { publicPath } from '../lib/routes';

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
  const [weapon, setWeapon] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  useEffect(() => {
    const c = new AbortController();
    API.get('/public/calendar', { signal: c.signal })
      .then(({ data }) => setEvents(Array.isArray(data?.events) ? data.events : []))
      .catch(() => !c.signal.aborted && setError('Calendrier indisponible pour le moment.'));
    return () => c.abort();
  }, []);
  const H = `h${headingLevel}`;
  const filtered = events && filterCalendar(events, { weapon, category, level });
  const shown = limit ? filtered?.slice(0, limit) : filtered;
  const months = [];
  for (const e of shown || []) {
    const m = monthLabel(e.start);
    if (months.at(-1)?.label !== m) months.push({ label: m, events: [] });
    months.at(-1).events.push(e);
  }
  return (
    <section className="calendar" aria-label={title}>
      <H className="calendar-title">{title}</H>
      {!limit && <div className="filter-row">
        <label>Arme <select value={weapon} onChange={e => setWeapon(e.target.value)}><option value="">Toutes les armes</option>{['Fleuret', 'Épée', 'Sabre'].map(w => <option key={w}>{w}</option>)}</select></label>
        <label>Catégorie <select value={category} onChange={e => setCategory(e.target.value)}><option value="">Toutes</option>{['M13','M15','M17','M20','U23','SENIOR','V1','V2','V3','V4'].map(c => <option key={c} value={c}>{c === 'SENIOR' ? 'Seniors' : c}</option>)}</select></label>
        <label>Niveau <select value={level} onChange={e => setLevel(e.target.value)}><option value="">Tous</option><option value="national">Nationales</option><option value="international">Internationales</option></select></label>
      </div>}
      {events && filtered?.length === 0 && <p>Aucune épreuve pour ces filtres.</p>}
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
                    <span className="muted">{e.label}</span>{e.calendarNote && <span className="muted">{e.calendarNote}</span>}
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
                      <span className="calendar-tag">{calendarFormat(e.format)}</span><span className="calendar-tag">{calendarWeapons(e).join(" · ")}</span>
                    </span>
                  </span>
                  {e.tournamentId && (
                    <a className="calendar-live" href={calendarLink(e, publicPath)}>
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
