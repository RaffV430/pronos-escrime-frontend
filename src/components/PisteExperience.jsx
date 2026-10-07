import { readPreviewFollows } from '../lib/previewFollows';
import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { useNow } from '../lib/polling';
import { isMatchClosed } from './matchPresentation';

export function ClubArenaWelcome({ user, matches }) {
  const now = useNow(5000);
  const open = matches.filter((match) => !isMatchClosed(match, now));
  const remaining = open.filter((match) => !match.predictions?.some((p) => p.userId === user.id)).length;
  const saved = open.length - remaining;
  return (
    <section className="arena-welcome">
      <div>
        <p className="arena-eyebrow">LE CLUB EST À VOUS</p>
        <h1>
          Salut {user.name || user.username},<br /> <em>en garde !</em>
        </h1>
        <p className="arena-intro">Vos favoris. Vos scores. Votre prochain beau coup.</p>
      </div>
      <div className="arena-progress">
        <span className="arena-live">
          <i /> À VOUS DE JOUER
        </span>
        <strong>
          {open.length ? remaining : 'À votre rythme'}
          {open.length > 0 && <small> {remaining === 1 ? 'match à pronostiquer' : 'matchs à pronostiquer'}</small>}
        </strong>
        <div className="arena-track">
          <span style={{ width: `${open.length ? (saved / open.length) * 100 : 0}%` }} />
        </div>
        <span className="arena-progress-note">
          {open.length
            ? `${saved} / ${open.length} pronostics enregistrés sur les matchs ouverts`
            : 'Retrouvez le podium, les poules et le tableau ci-dessous.'}
        </span>
      </div>
    </section>
  );
}
export function ArenaLeague({ userId }) {
  const [detail, setDetail] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    API.get('/community/leagues', { signal: controller.signal })
      .then(({ data }) =>
        data.length ? API.get(`/community/leagues/${data[0].id}`, { signal: controller.signal }) : null,
      )
      .then((response) => setDetail(response?.data || { rows: [] }))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);
  const rows = detail?.rows || detail?.ranking || [];
  return (
    <aside className="arena-league-card">
      <p className="arena-eyebrow">L’ESPRIT CLUB</p>
      <h2>Votre ligue</h2>
      <p className="muted">{detail?.league?.name || 'Vos partenaires de jeu'}</p>
      {failed ? (
        <p>Classement indisponible pour le moment.</p>
      ) : !detail ? (
        <p>Chargement…</p>
      ) : (
        <>
          <PistePodium rows={rows} />
          <ol className="arena-league-rows">
            {rows.slice(0, 6).map((row, index) => (
              <li key={row.id} className={row.id === userId ? 'is-me' : ''}>
                <span>{row.rank || index + 1}</span>
                <strong>{row.name}</strong>
                <b>{row.totalPoints} pts</b>
              </li>
            ))}
          </ol>
          {!rows.length && <p>Rejoignez une ligue depuis la communauté.</p>}
        </>
      )}
    </aside>
  );
}

export function ArenaHome({ user, matches, competition, tournament, onPlay, onMine, onCommunity, onLive }) {
  const now = useNow(5000);
  const open = matches.filter((m) => !isMatchClosed(m, now));
  const pending = open.filter((m) => !m.predictions?.some((p) => p.userId === user.id));
  const latest = matches.filter((m) => m.isFinished && m.predictions?.some((p) => p.userId === user.id)).at(-1);
  return (
    <div className="arena-home">
      <ClubArenaWelcome user={user} matches={matches} />
      <section className="arena-home-event">
        <div>
          <p className="arena-eyebrow">VOTRE ÉPREUVE</p>
          <h2>{tournament?.name || 'Votre tournoi'}</h2>
          <p>{competition?.name || 'Choisissez une épreuve pour commencer'}</p>
        </div>
        <PisteCountdown
          deadline={
            open
              .filter((m) => !m.awaitingPreviousRound && !m.timingUnverified)
              .map((m) => m.manualUnlockUntil || m.closesAt)
              .filter(Boolean)
              .sort()[0]
          }
        />
        <button onClick={onPlay}>Continuer mes pronostics →</button>
      </section>
      <div className="arena-dashboard">
        <section className="arena-featured">
          <p className="arena-eyebrow">À VOUS DE JOUER</p>
          <h2>Votre prochain beau coup.</h2>
          <p>
            {pending.length} {pending.length === 1 ? 'rencontre à compléter' : 'rencontres à compléter'} dans cette
            épreuve.
          </p>
          {pending.slice(0, 3).map((m) => (
            <button className="arena-home-match" key={m.id} onClick={onPlay}>
              <span className="arena-avatar">
                {m.player1
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </span>
              <span>
                <small>{m.round} · À pronostiquer</small>
                <strong>
                  {m.player1}
                  <br />
                  {m.player2}
                </strong>
              </span>
              <b>→</b>
            </button>
          ))}
          {!pending.length && <p>Vous êtes à jour. Les prochaines affiches apparaîtront ici.</p>}
          <button onClick={onPlay}>Accéder aux pronostics →</button>
        </section>
        <div>
          <ArenaLeague userId={user.id} />
          <button className="button-link" onClick={onCommunity}>
            Retrouver ma communauté →
          </button>
        </div>
        <section className="arena-featured">
          <p className="arena-eyebrow">AU BORD DES PISTES</p>
          <h2>Suivre les rencontres</h2>
          <p>Retrouvez les résultats synchronisés, vos pronostics et vos points.</p>
          <button onClick={onLive}>Voir les pistes →</button>
        </section>
        <section className="arena-home-result">
          <p className="arena-eyebrow">VOTRE DERNIER RÉSULTAT</p>
          <h2>{latest ? `${latest.player1} / ${latest.player2}` : 'Votre carnet de jeu'}</h2>
          <p>
            {latest
              ? `Résultat : ${latest.score1} – ${latest.score2}`
              : 'Retrouvez vos choix, vos résultats et vos points.'}
          </p>
          <button className="button-link" onClick={onMine}>
            Voir mon bilan →
          </button>
        </section>
      </div>
    </div>
  );
}

export function PisteFencers({ userId, roster = [] }) {
  const key = `pronos:followed:${userId}`;
  const [query, setQuery] = useState('');
  const [storageError, setStorageError] = useState('');
  const [selected, setSelected] = useState(null);
  const [followed, setFollowed] = useState(() => readPreviewFollows(localStorage, key));
  function toggle(athlete) {
    const next = followed.some((a) => a.id === athlete.id)
      ? followed.filter((a) => a.id !== athlete.id)
      : [...followed, athlete];
    setFollowed(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError('Le suivi reste actif pour cette session, mais cet appareil ne permet pas de le mémoriser.');
    }
  }
  const results = roster
    .filter((a) => a.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')))
    .slice(0, 8);
  return (
    <section className="piste-fencers arena-featured">
      <p className="arena-eyebrow">VOTRE BORD DE PISTE</p>
      <h2>Mes tireurs</h2>
      <p>Recherchez parmi les engagés de l’épreuve sélectionnée. Vos suivis restent sur cet appareil.</p>
      <input
        aria-label="Rechercher un tireur"
        placeholder="Nom ou prénom…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="piste-followed">
        {followed.map((a) => (
          <button key={a.id} aria-label={`Ne plus suivre ${a.name}`} onClick={() => toggle(a)}>
            ★ {a.name} ×
          </button>
        ))}
      </div>
      {results.map((a) => (
        <div className="piste-fencer-row" key={a.id}>
          <button className="button-link" onClick={() => setSelected(a)}>
            {a.name} · {a.country || 'Nation non renseignée'}
          </button>
          <button onClick={() => toggle(a)}>{followed.some((f) => f.id === a.id) ? 'Retirer' : 'Suivre'}</button>
        </div>
      ))}
      {!results.length && <p>Aucun engagé correspondant.</p>}
      {storageError && <p role="status">{storageError}</p>}
      <p className="muted">
        {roster.length} engagés · {results.length}{' '}
        {results.length === 1 ? 'suggestion affichée' : 'suggestions affichées'}. Affinez votre recherche pour trouver
        un autre tireur.
      </p>
      {selected && (
        <AthleteDialog
          athlete={selected}
          followed={followed.some((f) => f.id === selected.id)}
          onToggle={() => toggle(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
export function PistePodium({ rows }) {
  return (
    <div className="piste-podium" aria-label="Podium du classement">
      {[1, 0, 2].map(
        (index) =>
          rows[index] && (
            <div key={rows[index].id} className={`piste-place place-${index + 1}`}>
              <span className="arena-avatar">{rows[index].name?.slice(0, 2).toUpperCase()}</span>
              <strong>{rows[index].name}</strong>
              <div>
                <b>{rows[index].rank || index + 1}</b>
                <span>{rows[index].totalPoints} pts</span>
              </div>
            </div>
          ),
      )}
    </div>
  );
}

export function PisteCountdown({ deadline }) {
  const now = useNow(1000);
  const remaining = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000));
  if (!deadline || !Number.isFinite(remaining) || !remaining) return null;
  return (
    <div className="piste-countdown">
      <p>PROCHAINE ÉCHÉANCE</p>
      <div>
        {[
          [Math.floor(remaining / 86400), 'jours'],
          [Math.floor(remaining / 3600) % 24, 'heures'],
          [Math.floor(remaining / 60) % 60, 'min'],
          [remaining % 60, 'sec'],
        ].map(([n, label]) => (
          <span key={label}>
            <b>{String(n).padStart(2, '0')}</b>
            <small>{label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function AthleteDialog({ athlete, followed, onToggle, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const panel = dialog.current;
    panel?.showModal();
    return () => {
      panel?.close();
      trigger?.focus();
    };
  }, []);
  return (
    <dialog ref={dialog} className="piste-profile" aria-labelledby="athlete-profile-title" onCancel={onClose}>
      <div className="piste-profile-toolbar">
        <span className="arena-eyebrow">FICHE ATHLÈTE</span>
        <button aria-label="Fermer la fiche athlète" onClick={onClose}>
          Fermer ×
        </button>
      </div>
      <span className="arena-avatar">
        {athlete.name
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join('')}
      </span>
      <h2 id="athlete-profile-title">{athlete.name}</h2>
      <dl>
        <div>
          <dt>Nation</dt>
          <dd>{athlete.country || 'Non renseignée'}</dd>
        </div>
        <div>
          <dt>Classement d’entrée</dt>
          <dd>{athlete.entryRanking || 'Non renseigné'}</dd>
        </div>
      </dl>
      <p className="muted">Club et autres informations non renseignés dans la liste importée.</p>
      <button aria-pressed={followed} onClick={onToggle}>
        {followed ? '★ Tireur suivi' : '☆ Suivre ce tireur'}
      </button>
    </dialog>
  );
}
