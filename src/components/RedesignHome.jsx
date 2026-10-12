// Maquette de refonte (/maquette) : page d'entrée unique, visiteurs et joueurs, avec les données réelles
// du calendrier et des derniers podiums. Ne remplace aucune page existante.
import { useEffect, useMemo, useState } from 'react';
import API from '../api';
import { eventNameFr } from '../lib/eventName';
import './redesign.css';

const WEAPONS = {
  Fleuret: { key: 'foil', short: 'F' },
  Épée: { key: 'epee', short: 'E' },
  Sabre: { key: 'sabre', short: 'S' },
};
const GENDERS = { H: 'Hommes', F: 'Dames', HD: 'Hommes & Dames', D: 'Dames' };
const CATEGORY = (c) =>
  c === 'SENIOR' ? 'Seniors' : /^V\d$/.test(c) ? 'Vétérans' : /^M\d+$/.test(c) ? c : c.toLowerCase();
const categories = (list = []) => [...new Set(list.map(CATEGORY))].join(' · ');
const day = (iso) => new Date(`${iso}T12:00:00`);
const dateLabel = (iso, opts) => day(iso).toLocaleDateString('fr-FR', opts);
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
const others = (n) => (n > 1 ? `${n} autres épreuves` : '1 autre épreuve');
const readWeapon = () => {
  try {
    return localStorage.getItem('rd-weapon') || 'ALL';
  } catch {
    return 'ALL';
  }
};

function WeaponSummary({ list }) {
  // Pastilles par arme avec leur nombre d'épreuves : « F 1 · E 2 · S 1 ».
  return (
    <span className="rd-summary" aria-label="Épreuves par arme">
      {ORDER.map((w) => {
        const n = list.filter((e) => e.weapon === w).length;
        return n ? (
          <span key={w} className={`rd-summary-item rd-weapon-${WEAPONS[w].key}`} title={`${n} × ${w}`}>
            <span aria-hidden="true">{WEAPONS[w].short}</span>
            {n}
          </span>
        ) : null;
      })}
    </span>
  );
}

function EventRow({ e }) {
  return (
    <li className="rd-row">
      <WeaponChip weapon={e.weapon} />
      <span className="rd-row-main">
        <strong>{e.city}</strong>
        <span>
          {e.label} · {categories(e.categories)} · {GENDERS[e.gender] || ''}
        </span>
      </span>
      {e.demo && <em className="rd-demo-tag">fictif</em>}
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
  const ms = new Date(`${iso}T08:00:00`).getTime() - now;
  if (ms <= 0) return { live: true };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return { days, hours, minutes };
}

function WeaponChip({ weapon }) {
  const w = WEAPONS[weapon];
  if (!w) return null;
  return (
    <span className={`rd-weapon rd-weapon-${w.key}`}>
      <span aria-hidden="true">{w.short}</span>
      {weapon}
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

export default function RedesignHome() {
  const [events, setEvents] = useState(null);
  const [results, setResults] = useState(null);
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
  const countdown = useCountdown(next?.start);
  const primary = signedIn
    ? { href: '/pronostiquer', label: 'Faire mes pronostics' }
    : { href: '/inscription', label: 'Créer mon compte gratuit' };

  return (
    <div className="rd">
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
          <a href="/calendrier">Calendrier</a>
          <a href="/resultats">Résultats</a>
          <a className="rd-top-cta" href={signedIn ? '/accueil' : '/connexion'}>
            {signedIn ? 'Mon espace' : 'Se connecter'}
          </a>
        </nav>
      </header>

      {demo && (
        <p className="rd-demo-banner" role="note">
          Démonstration : des épreuves d’épée et de sabre <strong>fictives</strong> sont ajoutées au calendrier réel.
        </p>
      )}
      <section className="rd-hero" aria-labelledby="rd-hero-title">
        <p className="rd-eyebrow">
          Fleuret · Épée · Sabre — saison {season}–{season + 1}
        </p>
        <h1 id="rd-hero-title">
          Chaque touche compte.
          <br />
          <span>Pronostiquez-la.</span>
        </h1>
        <p className="rd-lead">
          Le rendez-vous des passionnés d’escrime : pronostics, résultats en direct et classements entre amis, club et
          délégations.
        </p>
        <Piste />
        {next ? (
          <article className="rd-next" aria-label={nextDay.length > 1 ? 'Prochaine journée' : 'Prochaine épreuve'}>
            <div className="rd-next-head">
              <span className="rd-next-tag">
                {nextDay.length > 1 ? `Prochaine journée · ${nextDay.length} épreuves` : 'Prochaine épreuve'}
              </span>
              {nextDay.length > 1 ? <WeaponSummary list={nextDay} /> : <WeaponChip weapon={next.weapon} />}
            </div>
            {nextDay.length > 1 ? (
              <>
                <h2>{dateLabel(next.start, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                <ul className="rd-next-list">
                  {nextDay.slice(0, 4).map((e) => (
                    <EventRow key={e.id} e={e} />
                  ))}
                  {nextDay.length > 4 && (
                    <li className="rd-more">
                      <a href="/calendrier">+ {others(nextDay.length - 4)} ce jour-là →</a>
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <>
                <h2>{next.label}</h2>
                <p className="rd-next-meta">
                  {next.city} · {dateLabel(next.start, { weekday: 'long', day: 'numeric', month: 'long' })}
                  <br />
                  {GENDERS[next.gender] || ''} · {categories(next.categories)}
                </p>
              </>
            )}
            {countdown && !countdown.live && (
              <div className="rd-countdown" role="timer" aria-label="Temps avant le début">
                {[
                  [countdown.days, 'jours'],
                  [countdown.hours, 'heures'],
                  [countdown.minutes, 'min'],
                ].map(([value, unit]) => (
                  <span key={unit}>
                    <b>{String(value).padStart(2, '0')}</b>
                    {unit}
                  </span>
                ))}
              </div>
            )}
            {countdown?.live && <p className="rd-live-badge">● En cours</p>}
          </article>
        ) : (
          <div className="rd-next rd-skeleton" aria-hidden="true" />
        )}
        <div className="rd-hero-actions">
          <a className="rd-button" href={primary.href}>
            {primary.label} →
          </a>
          <a className="rd-button rd-button-ghost" href="/calendrier">
            Voir le calendrier
          </a>
        </div>
      </section>

      <section className="rd-section" aria-labelledby="rd-agenda">
        <div className="rd-section-head">
          <h2 id="rd-agenda">À l’affiche</h2>
          <a href="/calendrier">Tout le calendrier →</a>
        </div>
        {weaponsPresent.length > 1 && (
          <div className="rd-filter" role="group" aria-label="Filtrer par arme">
            {['ALL', ...weaponsPresent].map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={activeWeapon === w}
                className={w === 'ALL' ? '' : `rd-weapon-${WEAPONS[w].key}`}
                onClick={() => setWeapon(w)}
              >
                {w !== 'ALL' && <span aria-hidden="true">{WEAPONS[w].short}</span>}
                {w === 'ALL' ? 'Toutes' : w}
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
                  <b>{dateLabel(date, { day: 'numeric' })}</b>
                  <span>{dateLabel(date, { month: 'short' }).replace('.', '')}</span>
                </div>
                <div>
                  <strong>{dateLabel(date, { weekday: 'long' })}</strong>
                  <span>{list.length > 1 ? `${list.length} épreuves` : '1 épreuve'}</span>
                </div>
                {list.length > 1 && <WeaponSummary list={list} />}
              </header>
              <ul>
                {list.slice(0, 4).map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
                {list.length > 4 && <li className="rd-more">+ {others(list.length - 4)}</li>}
              </ul>
            </article>
          ))}
          {!events && [0, 1, 2].map((i) => <div key={i} className="rd-day rd-skeleton" aria-hidden="true" />)}
        </div>
      </section>

      {latest && (
        <section className="rd-section" aria-labelledby="rd-podiums">
          <div className="rd-section-head">
            <h2 id="rd-podiums">Derniers podiums</h2>
            <a href="/resultats">Tous les résultats →</a>
          </div>
          <article className="rd-results">
            <header>
              <h3>{latest.name}</h3>
              <p>
                {latest.city} · {dateLabel(latest.start, { day: 'numeric', month: 'long' })}
              </p>
            </header>
            <div className="rd-podium-grid">
              {latest.competitions.slice(0, 4).map((c) => (
                <div className="rd-podium" key={c.id}>
                  <p className="rd-podium-event">
                    <WeaponChip weapon={weaponOf(c.name)} />
                    {eventNameFr(c.name).replace(/^(Fleuret|Épée|Sabre) · /, '')}
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

      <section className="rd-section" aria-labelledby="rd-how">
        <h2 id="rd-how">Comment ça marche</h2>
        <ol className="rd-steps">
          <li>
            <span className="rd-step-num">1</span>
            <h3>Choisissez une épreuve</h3>
            <p>Les compétitions nationales et internationales, au fleuret, à l’épée et au sabre.</p>
          </li>
          <li>
            <span className="rd-step-num">2</span>
            <h3>Pronostiquez avant l’assaut</h3>
            <p>Poules, tableau et podium. Le bon vainqueur rapporte, le score exact rapporte plus.</p>
          </li>
          <li>
            <span className="rd-step-num">3</span>
            <h3>Suivez en direct, grimpez au classement</h3>
            <p>Résultats officiels mis à jour pendant la compétition, points et classements aussitôt.</p>
          </li>
        </ol>
      </section>

      <section className="rd-section rd-friends" aria-labelledby="rd-friends">
        <div>
          <h2 id="rd-friends">Plus fun à plusieurs</h2>
          <p>
            Créez une délégation avec votre salle d’armes, votre famille ou vos partenaires d’entraînement. Invitez-les
            par leur nom d’utilisateur, et que le meilleur pronostiqueur gagne.
          </p>
        </div>
        <div className="rd-friends-board" aria-hidden="true">
          <small>Exemple de classement</small>
          {[
            ['1', 'Vous', '128'],
            ['2', 'Le maître d’armes', '121'],
            ['3', 'La salle', '97'],
          ].map(([rank, who, pts]) => (
            <div key={rank} className={rank === '1' ? 'is-me' : ''}>
              <b>{rank}</b>
              <span>{who}</span>
              <em>{pts} pts</em>
            </div>
          ))}
        </div>
      </section>

      <section className="rd-final" aria-label="Commencer">
        <h2>Prêt à croiser le fer ?</h2>
        <a className="rd-button" href={primary.href}>
          {primary.label} →
        </a>
      </section>

      {!signedIn && (
        <div className="rd-sticky" role="region" aria-label="Inscription">
          <span>C’est gratuit</span>
          <a className="rd-button" href="/inscription">
            Créer mon compte
          </a>
        </div>
      )}
    </div>
  );
}
