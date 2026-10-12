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
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(() => (events || []).filter((e) => (e.end || e.start) >= today), [events, today]);
  const next = upcoming[0];
  // Les prochains week-ends : une colonne par date, plusieurs épreuves possibles.
  const weekends = useMemo(() => {
    const byDate = new Map();
    for (const e of upcoming.slice(0, 18)) {
      if (!byDate.has(e.start)) byDate.set(e.start, []);
      byDate.get(e.start).push(e);
    }
    return [...byDate.entries()].slice(0, 6);
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
          <article className="rd-next" aria-label="Prochaine épreuve">
            <div className="rd-next-head">
              <span className="rd-next-tag">Prochaine épreuve</span>
              <WeaponChip weapon={next.weapon} />
            </div>
            <h2>{next.label}</h2>
            <p className="rd-next-meta">
              {next.city} · {dateLabel(next.start, { weekday: 'long', day: 'numeric', month: 'long' })}
              <br />
              {GENDERS[next.gender] || ''} · {categories(next.categories)}
            </p>
            {countdown && !countdown.live && (
              <div className="rd-countdown" role="timer" aria-label="Temps avant l’épreuve">
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
        <div className="rd-agenda" role="list">
          {weekends.map(([date, list]) => (
            <article className="rd-day" role="listitem" key={date}>
              <div className="rd-day-date">
                <b>{dateLabel(date, { day: 'numeric' })}</b>
                <span>{dateLabel(date, { month: 'short' }).replace('.', '')}</span>
              </div>
              <ul>
                {list.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <WeaponChip weapon={e.weapon} />
                    <strong>{e.city}</strong>
                    <span>
                      {categories(e.categories)} · {GENDERS[e.gender] || ''}
                    </span>
                  </li>
                ))}
                {list.length > 3 && <li className="rd-more">+ {list.length - 3} autres épreuves</li>}
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
