// Maquette de refonte (/maquette) : page d'entrée unique, visiteurs et joueurs, avec les données réelles
// du calendrier et des derniers podiums. Ne remplace aucune page existante.
import { useEffect, useMemo, useState } from 'react';
import API from '../api';
import { eventLabelFor, eventNameFor } from '../lib/eventName';
import { useI18n } from '../i18n/context';
import { segment } from '../lib/routes';
import './redesign.css';

const WEAPONS = {
  Fleuret: { key: 'foil', short: 'F' },
  Épée: { key: 'epee', short: 'E' },
  Sabre: { key: 'sabre', short: 'S' },
};
const gender = (t, g) => (['H', 'F', 'D', 'HD'].includes(g) ? t(`gender.${g}`) : '');
const CATEGORY = (t, c) =>
  c === 'SENIOR' ? t('category.SENIOR') : /^V\d$/.test(c) ? t('category.VET') : /^M\d+$/.test(c) ? c : c.toLowerCase();
const categories = (t, list = []) => [...new Set(list.map((c) => CATEGORY(t, c)))].join(' · ');
const day = (iso) => new Date(`${iso}T12:00:00`);
const dateLabel = (locale, iso, opts) => day(iso).toLocaleDateString(locale, opts);
// Nom d'épreuve sans l'arme (déjà montrée par la pastille).
const withoutWeapon = (text) => text.replace(/^(Fleuret|Épée|Sabre|Foil) · /, '');
const weaponOf = (name = '') =>
  /foil|fleuret/i.test(name)
    ? 'Fleuret'
    : /sabre|saber/i.test(name)
      ? 'Sabre'
      : /[ée]p[ée]e|epee/i.test(name)
        ? 'Épée'
        : null;

const ORDER = ['Fleuret', 'Épée', 'Sabre'];
const byWeapon = (a, b) => ORDER.indexOf(a.weapon) - ORDER.indexOf(b.weapon);

// Démonstration (/maquette?demo=armes) : épreuves d'épée et de sabre fictives ajoutées au calendrier réel,
// plusieurs le même jour, pour voir comment l'affichage tient la charge.
const DEMO = [
  [
    ['Épée', 'Épreuve nationale 1', 'Saint-Maur', 'F', ['SENIOR']],
    ['Sabre', 'Épreuve nationale 2', 'Orléans', 'H', ['M20']],
    ['Épée', 'Circuit national', 'Bordeaux', 'H', ['M17']],
    ['Sabre', 'Épreuve nationale 1', 'Dourdan', 'F', ['SENIOR']],
  ],
  [
    ['Sabre', 'Coupe du monde', 'Tunis', 'F', ['SENIOR']],
    ['Épée', 'Épreuve internationale 2', 'Heidenheim', 'H', ['M20']],
  ],
  [
    ['Épée', 'Épreuve nationale 2', 'Paris', 'H', ['SENIOR']],
    ['Sabre', 'Circuit national', 'Lyon', 'F', ['M17']],
    ['Épée', 'Épreuve internationale 3', 'Tauberbischofsheim', 'F', ['M20']],
  ],
];
function withDemo(events) {
  const dates = [...new Set(events.map((e) => e.start))];
  const extra = DEMO.flatMap((day, i) =>
    dates[i]
      ? day.map(([weapon, label, city, gender, cats], j) => ({
          id: `demo-${i}-${j}`,
          start: dates[i],
          end: dates[i],
          weapon,
          label,
          city,
          gender,
          categories: cats,
          demo: true,
        }))
      : [],
  );
  return [...events, ...extra].sort((a, b) => a.start.localeCompare(b.start) || byWeapon(a, b));
}
const readWeapon = () => {
  try {
    return localStorage.getItem('rd-weapon') || 'ALL';
  } catch {
    return 'ALL';
  }
};

function WeaponSummary({ list }) {
  // Pastilles par arme avec leur nombre d'épreuves : « F 1 · E 2 · S 1 ».
  const { t } = useI18n();
  return (
    <span className="rd-summary" aria-label={t('home.byWeapon')}>
      {ORDER.map((w) => {
        const n = list.filter((e) => e.weapon === w).length;
        return n ? (
          <span
            key={w}
            className={`rd-summary-item rd-weapon-${WEAPONS[w].key}`}
            title={`${n} × ${t(`weapon.${WEAPONS[w].key}`)}`}
          >
            <span aria-hidden="true">{WEAPONS[w].short}</span>
            {n}
          </span>
        ) : null;
      })}
    </span>
  );
}

function EventRow({ e }) {
  const { t, lang } = useI18n();
  return (
    <li className="rd-row">
      <WeaponChip weapon={e.weapon} />
      <span className="rd-row-main">
        <strong>{e.city}</strong>
        <span>
          {eventLabelFor(lang, e.label)} · {categories(t, e.categories)} · {gender(t, e.gender)}
        </span>
      </span>
      {e.demo && <em className="rd-demo-tag">{t('home.fictional')}</em>}
    </li>
  );
}

// Compte à rebours jusqu'au premier jour de l'épreuve (8 h, heure locale).
function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const ms = new Date(iso.length > 10 ? iso : `${iso}T08:00:00`).getTime() - now;
  if (ms <= 0) return { live: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return { days, hours, minutes };
}

function WeaponChip({ weapon }) {
  const { t } = useI18n();
  const w = WEAPONS[weapon];
  if (!w) return null;
  return (
    <span className={`rd-weapon rd-weapon-${w.key}`}>
      <span aria-hidden="true">{w.short}</span>
      {t(`weapon.${w.key}`)}
    </span>
  );
}

function Piste() {
  // Piste stylisée : lignes de mise en garde, centre et fins de piste.
  return (
    <svg className="rd-piste" viewBox="0 0 400 60" aria-hidden="true" preserveAspectRatio="none">
      <rect x="0" y="18" width="400" height="24" rx="3" className="rd-piste-strip" />
      {[20, 120, 200, 280, 380].map((x) => (
        <line key={x} x1={x} x2={x} y1={x === 200 ? 12 : 18} y2={x === 200 ? 48 : 42} className="rd-piste-line" />
      ))}
      <circle cx="200" cy="30" r="3" className="rd-piste-dot" />
    </svg>
  );
}

// Tableau de bord du joueur (refonte) : sa place, ses points, son meilleur coup et ses délégations.
function usePlayer(user) {
  const [me, setMe] = useState(null);
  useEffect(() => {
    if (!user) return;
    const c = new AbortController();
    Promise.allSettled([
      API.get('/matches/leaderboard', { signal: c.signal }),
      API.get('/me/season', { signal: c.signal }),
      API.get('/community/leagues', { signal: c.signal }),
    ]).then(([board, season, leagues]) => {
      if (c.signal.aborted) return;
      const rows = board.status === 'fulfilled' && Array.isArray(board.value.data) ? board.value.data : [];
      const index = rows.findIndex((r) => r.id === user.id);
      const row = rows[index];
      const ahead = index > 0 ? rows[index - 1] : null;
      setMe({
        rank: row?.rank ?? null,
        players: rows.length,
        points: row?.totalPoints ?? 0,
        gap: ahead && row ? Math.max(0, ahead.totalPoints - row.totalPoints) : null,
        best: season.status === 'fulfilled' ? season.value.data?.analysis?.bestCall || null : null,
        leagues: leagues.status === 'fulfilled' && Array.isArray(leagues.value.data) ? leagues.value.data : [],
      });
    });
    return () => c.abort();
  }, [user]);
  return me;
}

export default function RedesignHome({ user = null, onNavigate = null }) {
  const me = usePlayer(user);
  const { t, lang, locale, setLang } = useI18n();
  // Dans l'application, les liens internes changent d'onglet sans recharger la page.
  const go = (tab) => (event) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(tab);
  };
  const [events, setEvents] = useState(null);
  const [results, setResults] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loadedAt] = useState(() => Date.now());
  const signedIn = (() => {
    try {
      return Boolean(localStorage.getItem('token'));
    } catch {
      return false;
    }
  })();
  useEffect(() => {
    const c = new AbortController();
    API.get('/public/calendar', { signal: c.signal })
      .then(({ data }) => setEvents(data?.events || []))
      .catch(() => setEvents([]));
    API.get('/public/tournaments', { signal: c.signal })
      .then(({ data }) => setTournaments(Array.isArray(data) ? data : []))
      .catch(() => setTournaments([]));
    API.get('/public/results', { signal: c.signal })
      .then(({ data }) => setResults(Array.isArray(data) ? data : []))
      .catch(() => setResults([]));
    return () => c.abort();
  }, []);
  const demo = new URLSearchParams(location.search).get('demo') === 'armes';
  const [weapon, setWeaponState] = useState(readWeapon);
  const setWeapon = (value) => {
    setWeaponState(value);
    try {
      localStorage.setItem('rd-weapon', value);
    } catch {
      /* préférence non gardée */
    }
  };
  const today = new Date().toISOString().slice(0, 10);
  const all = useMemo(() => {
    const list = (events || []).filter((e) => (e.end || e.start) >= today);
    return demo ? withDemo(list) : list;
  }, [events, today, demo]);
  // Les armes réellement présentes : le filtre n'apparaît que s'il y a un choix à faire.
  const weaponsPresent = ORDER.filter((w) => all.some((e) => e.weapon === w));
  const activeWeapon = weaponsPresent.includes(weapon) ? weapon : 'ALL';
  const upcoming = activeWeapon === 'ALL' ? all : all.filter((e) => e.weapon === activeWeapon);
  // Prochaine journée : toutes les épreuves de cette date, pas seulement la première.
  const nextDate = upcoming[0]?.start;
  const nextDay = upcoming.filter((e) => e.start === nextDate).sort(byWeapon);
  const next = nextDay[0];
  // Les prochains week-ends : une colonne par date, plusieurs épreuves possibles.
  const weekends = useMemo(() => {
    const byDate = new Map();
    for (const e of upcoming) {
      if (!byDate.has(e.start)) byDate.set(e.start, []);
      byDate.get(e.start).push(e);
    }
    return [...byDate.entries()].slice(0, 6).map(([date, list]) => [date, [...list].sort(byWeapon)]);
  }, [upcoming]);
  const latest = results?.[0];
  // Saison d'escrime : de septembre à août.
  const season = new Date().getFullYear() - (new Date().getMonth() < 8 ? 1 : 0);
  // Épreuve déjà importée et ouverte aux pronostics : elle passe avant le calendrier général.
  const open = useMemo(() => {
    const soon = loadedAt - 10 * 3600000;
    return tournaments
      .filter((t) => !t.finished)
      .flatMap((t) => (t.competitions || []).map((c) => ({ ...c, tournament: t })))
      .filter((c) => c.startsAt && Date.parse(c.startsAt) >= soon)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  }, [tournaments, loadedAt]);
  const openFirst = open && (!next || open.startsAt.slice(0, 10) <= next.start);
  const countdown = useCountdown(openFirst ? open.startsAt : next?.start);
  const primary = signedIn
    ? { href: '/pronostiquer', label: t('home.play'), tab: 'play' }
    : { href: '/inscription', label: t('home.signup') };
  const countdownUnits = (c) => [
    [c.days, t('home.days')],
    [c.hours, t('home.hours')],
    [c.minutes, t('home.minutes')],
  ];

  return (
    <div className={user ? 'rd rd-dashboard' : 'rd'}>
      {!user && (
        <header className="rd-top">
          <a className="rd-brand" href="/maquette">
            <span className="rd-logo" aria-hidden="true">
              P
            </span>
            <span>
              <strong>pronos</strong> escrime
            </span>
          </a>
          <nav className="rd-top-links" aria-label="Navigation">
            <a href="/calendrier">{t('home.calendarLink')}</a>
            <a href="/resultats">{t('home.resultsLink')}</a>
            <button
              type="button"
              className="rd-lang"
              aria-label={t('lang.switchAria')}
              onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            >
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
            <a className="rd-top-cta" href={signedIn ? '/accueil' : '/connexion'}>
              {signedIn ? t('menu.space') : t('home.login')}
            </a>
          </nav>
        </header>
      )}

      {demo && (
        <p className="rd-demo-banner" role="note">
          {t('home.demo')}
        </p>
      )}
      <section className="rd-hero" aria-labelledby="rd-hero-title">
        <p className="rd-eyebrow">{t('home.season', { from: season, to: season + 1 })}</p>
        {user ? (
          <>
            <h1 id="rd-hero-title">
              {t('home.hello', { name: user.name || user.username })}
              <br />
              <span>{t('home.enGarde')}</span>
            </h1>
            <div className="rd-stats" aria-label={t('home.myStats')}>
              <a href="/classements" onClick={go('leaderboard')}>
                <b>{me?.rank ? t('home.rank', { rank: me.rank }) : '–'}</b>
                <span>{me?.players ? t('home.rankOf', { n: me.players }) : t('home.inRanking')}</span>
              </a>
              <a href="/mes-pronostics" onClick={go('mine')}>
                <b>{me ? me.points : '–'}</b>
                <span>{t('home.points')}</span>
              </a>
              <a href="/classements" onClick={go('leaderboard')}>
                <b>{me?.gap != null ? `+${me.gap}` : '–'}</b>
                <span>{me?.gap != null ? t('home.gap') : t('home.leading')}</span>
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 id="rd-hero-title">
              {t('home.title1')}
              <br />
              <span>{t('home.title2')}</span>
            </h1>
            <p className="rd-lead">{t('home.lead')}</p>
          </>
        )}
        <Piste />
        {openFirst ? (
          <article className="rd-next rd-next-open" aria-label={t('home.openAria')}>
            <div className="rd-next-head">
              <span className="rd-next-tag">{countdown?.live ? t('home.liveNow') : t('home.openTag')}</span>
              <WeaponChip weapon={weaponOf(open.name)} />
            </div>
            <h2>{withoutWeapon(eventNameFor(lang, open.name))}</h2>
            <p className="rd-next-meta">
              {open.tournament.name}
              <br />
              {open.tournament.city ? `${open.tournament.city} · ` : ''}
              {new Date(open.startsAt).toLocaleString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              {t('home.parisTime')}
            </p>
            {countdown && !countdown.live && (
              <div className="rd-countdown" role="timer" aria-label={t('home.countdownAria')}>
                {countdownUnits(countdown).map(([value, unit]) => (
                  <span key={unit}>
                    <b>{String(value).padStart(2, '0')}</b>
                    {unit}
                  </span>
                ))}
              </div>
            )}
            <a
              className="rd-button rd-next-cta"
              href={`/pronostiquer/${segment(open.tournament.name, open.tournament.id)}/${segment(open.name, open.id)}/poules`}
            >
              {countdown?.live ? t('home.followAndPlay') : t('home.playThis')}
            </a>
          </article>
        ) : next ? (
          <article className="rd-next" aria-label={nextDay.length > 1 ? t('home.nextDay') : t('home.nextEvent')}>
            <div className="rd-next-head">
              <span className="rd-next-tag">
                {nextDay.length > 1 ? t('home.nextDayCount', { n: nextDay.length }) : t('home.nextEvent')}
              </span>
              {nextDay.length > 1 ? <WeaponSummary list={nextDay} /> : <WeaponChip weapon={next.weapon} />}
            </div>
            {nextDay.length > 1 ? (
              <>
                <h2>{dateLabel(locale, next.start, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <ul className="rd-next-list">
                  {nextDay.slice(0, 4).map((e) => (
                    <EventRow key={e.id} e={e} />
                  ))}
                  {nextDay.length > 4 && (
                    <li className="rd-more">
                      <a href="/calendrier">
                        {t('home.moreThatDay', { others: t('home.others', { n: nextDay.length - 4 }) })}
                      </a>
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <>
                <h2>{eventLabelFor(lang, next.label)}</h2>
                <p className="rd-next-meta">
                  {next.city} · {dateLabel(locale, next.start, { weekday: 'long', day: 'numeric', month: 'long' })}
                  <br />
                  {gender(t, next.gender)} · {categories(t, next.categories)}
                </p>
              </>
            )}
            {countdown && !countdown.live && (
              <div className="rd-countdown" role="timer" aria-label={t('home.countdownAria')}>
                {countdownUnits(countdown).map(([value, unit]) => (
                  <span key={unit}>
                    <b>{String(value).padStart(2, '0')}</b>
                    {unit}
                  </span>
                ))}
              </div>
            )}
            {countdown?.live && <p className="rd-live-badge">{t('home.liveNow')}</p>}
          </article>
        ) : (
          <div className="rd-next rd-skeleton" aria-hidden="true" />
        )}
        <div className="rd-hero-actions">
          <a className="rd-button" href={primary.href} onClick={primary.tab ? go(primary.tab) : undefined}>
            {primary.label} →
          </a>
          {user ? (
            <a className="rd-button rd-button-ghost" href="/direct" onClick={go('live')}>
              {t('home.followLive')}
            </a>
          ) : (
            <a className="rd-button rd-button-ghost" href="/calendrier">
              {t('home.calendar')}
            </a>
          )}
        </div>
      </section>

      <section className="rd-section" aria-labelledby="rd-agenda">
        <div className="rd-section-head">
          <h2 id="rd-agenda">{t('home.agenda')}</h2>
          <a href="/calendrier">{t('home.allCalendar')}</a>
        </div>
        {weaponsPresent.length > 1 && (
          <div className="rd-filter" role="group" aria-label={t('home.filterWeapon')}>
            {['ALL', ...weaponsPresent].map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={activeWeapon === w}
                className={w === 'ALL' ? '' : `rd-weapon-${WEAPONS[w].key}`}
                onClick={() => setWeapon(w)}
              >
                {w !== 'ALL' && <span aria-hidden="true">{WEAPONS[w].short}</span>}
                {w === 'ALL' ? t('home.allWeapons') : t(`weapon.${WEAPONS[w].key}`)}
                <small>{w === 'ALL' ? all.length : all.filter((e) => e.weapon === w).length}</small>
              </button>
            ))}
          </div>
        )}
        <div className="rd-agenda" role="list">
          {weekends.map(([date, list]) => (
            <article className="rd-day" role="listitem" key={date}>
              <header className="rd-day-head">
                <div className="rd-day-date">
                  <b>{dateLabel(locale, date, { day: 'numeric' })}</b>
                  <span>{dateLabel(locale, date, { month: 'short' }).replace('.', '')}</span>
                </div>
                <div>
                  <strong>{dateLabel(locale, date, { weekday: 'long' })}</strong>
                  <span>{t('home.events', { n: list.length })}</span>
                </div>
                {list.length > 1 && <WeaponSummary list={list} />}
              </header>
              <ul>
                {list.slice(0, 4).map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
                {list.length > 4 && <li className="rd-more">+ {t('home.others', { n: list.length - 4 })}</li>}
              </ul>
            </article>
          ))}
          {!events && [0, 1, 2].map((i) => <div key={i} className="rd-day rd-skeleton" aria-hidden="true" />)}
        </div>
      </section>

      {latest && (
        <section className="rd-section" aria-labelledby="rd-podiums">
          <div className="rd-section-head">
            <h2 id="rd-podiums">{t('home.podiums')}</h2>
            <a href="/resultats">{t('home.allResults')}</a>
          </div>
          <article className="rd-results">
            <header>
              <h3>{latest.name}</h3>
              <p>
                {latest.city} · {dateLabel(locale, latest.start, { day: 'numeric', month: 'long' })}
              </p>
            </header>
            <div className="rd-podium-grid">
              {latest.competitions.slice(0, 4).map((c) => (
                <div className="rd-podium" key={c.id}>
                  <p className="rd-podium-event">
                    <WeaponChip weapon={weaponOf(c.name)} />
                    {withoutWeapon(eventNameFor(lang, c.name))}
                  </p>
                  <ol>
                    {c.podium.slice(0, 3).map((p, i) => (
                      <li key={`${p.place}-${p.name}`} className={`rd-medal rd-medal-${i + 1}`}>
                        <span className="rd-medal-dot" aria-hidden="true">
                          {p.place}
                        </span>
                        <span className="rd-medal-name">{p.name}</span>
                        <span className="rd-medal-country">{p.country}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {user && (
        <section className="rd-section rd-mine" aria-labelledby="rd-mine">
          <h2 id="rd-mine">{t('home.mySeason')}</h2>
          <div className="rd-mine-grid">
            <article className="rd-card">
              <p className="rd-card-tag">{t('home.bestCall')}</p>
              {me?.best ? (
                <>
                  <h3>{me.best.name}</h3>
                  <p className="rd-best">
                    <span>
                      {t('home.prediction')} <b>{me.best.prediction}</b>
                    </span>
                    <span>
                      {t('home.result')} <b>{me.best.result}</b>
                    </span>
                    <em>{t('home.pts', { n: me.best.points })}</em>
                  </p>
                </>
              ) : (
                <p className="rd-muted">{t('home.firstCall')}</p>
              )}
              <a href="/ma-saison" onClick={go('season')}>
                {t('home.seeSeason')}
              </a>
            </article>
            <article className="rd-card">
              <p className="rd-card-tag">{t('home.myLeagues')}</p>
              {me?.leagues?.length ? (
                <ul className="rd-leagues">
                  {me.leagues.slice(0, 3).map((l) => (
                    <li key={l.id}>
                      <span className="rd-league-avatar" aria-hidden="true">
                        {l.name.slice(0, 2).toUpperCase()}
                      </span>
                      <strong>{l.name}</strong>
                      <span>{t('home.members', { n: l._count?.members ?? '' })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rd-muted">{t('home.leaguesHint')}</p>
              )}
              <a href="/communaute" onClick={go('community')}>
                {me?.leagues?.length ? t('home.seeRankings') : t('home.createLeague')}
              </a>
            </article>
          </div>
        </section>
      )}

      {!user && (
        <>
          <section className="rd-section" aria-labelledby="rd-how">
            <h2 id="rd-how">{t('home.how')}</h2>
            <ol className="rd-steps">
              <li>
                <span className="rd-step-num">1</span>
                <h3>{t('home.step1')}</h3>
                <p>{t('home.step1Text')}</p>
              </li>
              <li>
                <span className="rd-step-num">2</span>
                <h3>{t('home.step2')}</h3>
                <p>{t('home.step2Text')}</p>
              </li>
              <li>
                <span className="rd-step-num">3</span>
                <h3>{t('home.step3')}</h3>
                <p>{t('home.step3Text')}</p>
              </li>
            </ol>
          </section>

          <section className="rd-section rd-friends" aria-labelledby="rd-friends">
            <div>
              <h2 id="rd-friends">{t('home.friends')}</h2>
              <p>{t('home.friendsText')}</p>
            </div>
            <div className="rd-friends-board" aria-hidden="true">
              <small>{t('home.sampleRanking')}</small>
              {[
                ['1', t('home.sampleYou'), '128'],
                ['2', t('home.sampleMaster'), '121'],
                ['3', t('home.sampleClub'), '97'],
              ].map(([rank, who, pts]) => (
                <div key={rank} className={rank === '1' ? 'is-me' : ''}>
                  <b>{rank}</b>
                  <span>{who}</span>
                  <em>{pts} pts</em>
                </div>
              ))}
            </div>
          </section>

          <section className="rd-final" aria-label={t('home.start')}>
            <h2>{t('home.ready')}</h2>
            <a className="rd-button" href={primary.href}>
              {primary.label} →
            </a>
          </section>
        </>
      )}

      {!signedIn && !user && (
        <div className="rd-sticky" role="region" aria-label={t('home.signupAria')}>
          <span>{t('home.free')}</span>
          <a className="rd-button" href="/inscription">
            {t('home.createAccount')}
          </a>
        </div>
      )}
    </div>
  );
}
