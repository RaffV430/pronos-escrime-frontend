import { eventNameFr } from '../lib/eventName';
import { remainingLocalFollows } from '../lib/fencerFollowMigration';
import { useFencerFollows } from '../lib/fencerFollows';
import { readPreviewFollows } from '../lib/previewFollows';
import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { useNow } from '../lib/polling';
import { isMatchClosed } from './matchPresentation';

export function ClubArenaWelcome({ user, matches, greetingOnly = false, progressOnly = false }) {
  const now = useNow(5000);
  const open = matches.filter((match) => !isMatchClosed(match, now));
  const remaining = open.filter((match) => !match.predictions?.some((p) => p.userId === user.id)).length;
  const saved = open.length - remaining;
  return (
    <section className={`arena-welcome${greetingOnly ? " greeting-only" : ""}${progressOnly ? " progress-only" : ""}`}>
      {!progressOnly && <div>
        <p className="arena-eyebrow">LE CLUB EST À VOUS</p>
        <h1>
          Salut {user.name || user.username},<br /> <em>en garde !</em>
        </h1>
        <p className="arena-intro">Vos favoris. Vos scores. Votre prochaine belle touche.</p>
      </div>}
      {!greetingOnly && <div className="arena-progress">
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
      </div>}
    </section>
  );
}
export function ArenaLeague({ userId, onCommunity }) {
  const [detail, setDetail] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      API.get('/community/leagues', { signal: controller.signal }),
      API.get('/community/favorite', { signal: controller.signal }),
    ])
      .then(([{ data }, { data: favorite }]) => {
        const league = data.find((l) => l.id === favorite.leagueId) || data[0];
        return league ? API.get(`/community/leagues/${league.id}`, { signal: controller.signal }) : null;
      })
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
      <h2>Votre délégation</h2>
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
          {!rows.length && <p>Rejoignez une délégation depuis la communauté.</p>}
        </>
      )}
      {onCommunity && (
        <button className="button-link arena-community-link" onClick={onCommunity}>
          Mes délégations →
        </button>
      )}
    </aside>
  );
}

export function ArenaHome({ user, matches, competition, tournament, onPlay, onMine, onCommunity, onLive }) {
  const follows = useFencerFollows();
  const participantNames = (competition?.podiumRoster || [])
    .filter((e) => follows?.links.some((l) => l.entryId === String(e.id)))
    .map((e) => e.name);
  const [scheduledEvent, setScheduledEvent] = useState(null);
  const scheduledStart = scheduledEvent?.startsAt;
  useEffect(() => {
    setScheduledEvent(null);
    const controller = new AbortController();
    API.get('/public/tournaments', { signal: controller.signal })
      .then(({ data }) => {
        const events = data.flatMap(t => (t.competitions || []).map(c => ({...c,tournamentName:t.name})));
        const event = competition?.id ? events.find(c => c.id === competition.id) : events.filter(c => Date.parse(c.startsAt) > Date.now()).sort((a,b) => Date.parse(a.startsAt)-Date.parse(b.startsAt))[0];
        setScheduledEvent(event || null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [competition?.id]);
  const now = useNow(5000);
  const open = matches.filter((m) => !isMatchClosed(m, now));
  const pending = open.filter((m) => !m.predictions?.some((p) => p.userId === user.id));
  const latest = matches.filter((m) => m.isFinished && m.predictions?.some((p) => p.userId === user.id)).at(-1);
  return (
    <div className="arena-home">
      <ClubArenaWelcome user={user} matches={matches} greetingOnly />
      {pending.length > 0 && <ClubArenaWelcome user={user} matches={matches} progressOnly />}
      <section className="arena-home-event">
        <div>
          <p className="arena-eyebrow">VOTRE ÉPREUVE</p>
          <h2>{tournament?.name || scheduledEvent?.tournamentName || 'Votre tournoi'}</h2>
          <p>{eventNameFr(competition?.name || scheduledEvent?.name) || 'Choisissez une épreuve pour commencer'}</p>
        {!!participantNames.length && (
          <p className="muted arena-followed-note">
            <span className="favorite-star" aria-label="Favoris">★</span> {participantNames.slice(0, 3).join(', ')}
            {participantNames.length > 3 ? ` et ${participantNames.length - 3} autre(s)` : ''} participe
            {participantNames.length > 1 ? 'nt' : ''} à cette épreuve
          </p>
        )}
        </div>
        <PisteCountdown
          deadline={
            open
              .filter((m) => !m.awaitingPreviousRound && !m.timingUnverified)
              .map((m) => m.manualUnlockUntil || m.closesAt)
              .filter(Boolean)
              .sort()[0] || (Date.parse(scheduledStart) > now ? scheduledStart : null)
          }
        />
        <button onClick={onPlay}>Continuer mes pronostics →</button>
      </section>
      {pending.length === 0 && <ClubArenaWelcome user={user} matches={matches} progressOnly />}
      <div className="arena-dashboard">
        <div className="arena-home-column">
          <section className="arena-featured">
            <p className="arena-eyebrow">À VOUS DE JOUER</p>
            <h2>Votre prochaine belle touche.</h2>
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
        <div className="arena-home-column">
          <ArenaLeague userId={user.id} onCommunity={onCommunity} />
        </div>
      </div>
    </div>
  );
}

export function PisteFencers({ userId, tournamentId: currentTournamentId }) {
  const key = `pronos:followed:${userId}`;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const follows = useFencerFollows();
  const [legacy, setLegacy] = useState(() => readPreviewFollows(localStorage, key));
  const [migrationNotice, setMigrationNotice] = useState('');
  const [tournamentId, setTournamentId] = useState(currentTournamentId || '');
  const [tournaments, setTournaments] = useState([]);
  const [tournamentError, setTournamentError] = useState('');
  useEffect(() => {
    if (currentTournamentId) setTournamentId(currentTournamentId);
  }, [currentTournamentId]);
  useEffect(() => {
    const c = new AbortController();
    API.get('/tournaments', { signal: c.signal })
      .then(({ data }) => setTournaments(data))
      .catch(() => {
        if (!c.signal.aborted)
          setTournamentError('Impossible de charger les tournois. Réessayez en rouvrant cette section.');
      });
    return () => c.abort();
  }, []);
  const [eventId, setEventId] = useState('');
  const [clubOnly, setClubOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [directory, setDirectory] = useState({ results: [], events: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [revision, setRevision] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  useEffect(() => {
    setEventId('');
    setOffset(0);
    setSelected(null);
  }, [tournamentId]);
  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      setSearchError('');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setSearchError('');
    const timer = setTimeout(async () => {
      try {
        const { data } = await API.get('/me/fencers/directory', {
          signal: controller.signal,
          params: {
            tournamentId,
            ...(eventId ? { competitionId: eventId } : {}),
            query,
            ...(clubOnly ? { clubOnly: '1' } : {}),
            offset,
          },
        });
        if (!controller.signal.aborted) setDirectory(data);
      } catch (e) {
        if (!controller.signal.aborted) setSearchError(e.response?.data?.error || 'Recherche indisponible. Réessayez.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tournamentId, eventId, query, clubOnly, offset, revision, follows.favorites]);
  const favoriteOf = (athlete) => directory.results.find((row) => row.key === athlete.key)?.favoriteId;
  async function toggle(athlete) {
    const id = favoriteOf(athlete);
    if (id) await follows.remove(id);
    else await follows.follow(athlete.id, athlete.competitionId);
  }
  async function followVisibleClub() {
    setBulkBusy(true);
    for (const athlete of directory.results.filter((a) => !a.favoriteId)) {
      if (!(await follows.follow(athlete.id, athlete.competitionId))) break;
    }
    setBulkBusy(false);
  }
  async function importLegacy() {
    const submitted = legacy.slice(0, 200);
    const result = await follows.importLocal(submitted);
    if (!result) return;
    const remaining = remainingLocalFollows(legacy, submitted.length, result);
    try {
      localStorage.setItem(key, JSON.stringify(remaining));
      setLegacy(remaining);
    } catch {
      /* Les anciens favoris restent récupérables ; l’import serveur est idempotent. */
    }
    setMigrationNotice(
      remaining.length
        ? `${remaining.length} ${remaining.length === 1 ? 'favori reste à récupérer. Il reste' : 'favoris restent à récupérer. Ils restent'} sur cet appareil ; retrouvez-les dans la liste officielle pour les suivre.`
        : 'Vos anciens favoris ont été rattachés à votre compte.',
    );
  }
  const results = loading || searchError ? [] : directory.results;
  const busy = follows.busy || bulkBusy || loading;
  return (
    <section className="piste-fencers arena-featured">
      <p className="arena-eyebrow">VOTRE BORD DE PISTE</p>
      <h2>Mes tireurs</h2>
      <p>
        Recherchez parmi les engagés de tout le tournoi, ou choisissez une épreuve ici. Vos suivis sont enregistrés dans
        votre compte, sur tous vos appareils et pour les prochains tournois.
      </p>
      {tournamentError && <p role="alert">{tournamentError}</p>}
      <div className="piste-fencer-search">
        <label>
          Tournoi
          <select
            disabled={bulkBusy}
            value={tournamentId}
            onChange={(e) => {
              setTournamentId(e.target.value);
              setEventId('');
              setOffset(0);
              setDirectory({ results: [], events: [], total: 0 });
            }}
          >
            <option value="">Choisir un tournoi</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Épreuve
          <select
            disabled={bulkBusy}
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              setOffset(0);
              setSelected(null);
            }}
          >
            <option value="">Toutes les épreuves du tournoi</option>
            {directory.events.map((event) => (
              <option key={event.id} value={event.id}>
                {eventNameFr(event.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rechercher un tireur
          <input
            disabled={bulkBusy}
            placeholder="Au moins 2 lettres : nom, prénom ou club…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
              setSelected(null);
            }}
          />
        </label>
        <button
          disabled={bulkBusy}
          aria-pressed={clubOnly}
          onClick={() => {
            setClubOnly(!clubOnly);
            setOffset(0);
            setSelected(null);
          }}
        >
          {clubOnly ? '✓ ' : ''}Tireurs de mon club
        </button>
      </div>
      {clubOnly && (
        <p className="muted">
          Club de l’application : {directory.clubName || 'non configuré'}. Vérifiez les identités avant de suivre.
        </p>
      )}
      <h3>Tireurs suivis · {follows.favorites.length}</h3>
      <div className="piste-followed">
        {follows.favorites.map((a) => (
          <button
            key={a.id}
            aria-label={`Ne plus suivre ${a.name}`}
            disabled={busy}
            onClick={() => follows.remove(a.id)}
          >
            ★ {a.name} · {[a.country, a.club].filter(Boolean).join(' · ')} ×
          </button>
        ))}
      </div>
      {results.map((a) => (
        <div className="piste-fencer-row" key={a.key}>
          <button className="button-link" onClick={() => setSelected(a)}>
            {a.name} · {[a.country, a.club].filter(Boolean).join(' · ') || 'Nation et club non renseignés'}
            <small className="piste-fencer-events">{a.events.map((event) => eventNameFr(event.name)).join(' · ')}</small>
          </button>
          <button disabled={busy || !follows.ready} onClick={() => toggle(a)}>
            {favoriteOf(a) ? 'Retirer' : 'Suivre'}
          </button>
        </div>
      ))}
      {loading && <p role="status">Recherche des engagés…</p>}
      {searchError && (
        <p role="alert">
          {searchError} <button onClick={() => setRevision((n) => n + 1)}>Réessayer</button>
        </p>
      )}
      {!loading && !searchError && !results.length && (
        <p>
          {!tournamentId
            ? 'Choisissez un tournoi pour rechercher ses engagés.'
            : query.trim().length < 2 && !clubOnly
              ? 'Saisissez au moins deux lettres pour rechercher dans le tournoi.'
              : 'Aucun engagé correspondant.'}
        </p>
      )}
      {clubOnly && results.some((a) => !a.favoriteId) && (
        <button disabled={busy || !follows.ready} onClick={followVisibleClub}>
          Suivre les tireurs affichés ({results.filter((a) => !a.favoriteId).length})
        </button>
      )}
      <div className="piste-fencer-pages">
        {offset > 0 && (
          <button
            disabled={busy}
            onClick={() => {
              setOffset(Math.max(0, offset - 20));
              setSelected(null);
            }}
          >
            Précédents
          </button>
        )}
        {directory.nextOffset != null && (
          <button
            disabled={busy}
            onClick={() => {
              setOffset(directory.nextOffset);
              setSelected(null);
            }}
          >
            Suivants
          </button>
        )}
      </div>
      {!follows.ready && !follows.error && <p role="status">Chargement de vos favoris…</p>}
      {follows.error && (
        <p role="alert">
          {follows.error} <button onClick={follows.refresh}>Réessayer</button>
        </p>
      )}
      {follows.ambiguousIds.length > 0 && (
        <p role="status">
          Certains favoris portent le même nom qu’un engagé sans identité concordante. Vérifiez la nation et le club
          avant de le suivre dans cette épreuve.
        </p>
      )}
      {legacy.length > 0 && (
        <button disabled={follows.busy || !follows.ready} onClick={importLegacy}>
          Récupérer mes {legacy.length} favoris de cet appareil
        </button>
      )}
      {migrationNotice && <p role="status">{migrationNotice}</p>}
      {!loading && !searchError && (
        <p className="muted">
          {directory.total} tireurs trouvés · {results.length} affichés.
        </p>
      )}
      {selected && (
        <AthleteDialog
          athlete={selected}
          followed={Boolean(favoriteOf(selected))}
          busy={busy || !follows.ready}
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

export function PisteCountdown({ deadline, label = 'PROCHAINE ÉCHÉANCE' }) {
  const now = useNow(1000);
  const remaining = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000));
  if (!deadline || !Number.isFinite(remaining) || !remaining) return null;
  return (
    <div className="piste-countdown">
      <p>{label}</p>
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

function AthleteDialog({ athlete, followed, busy, onToggle, onClose }) {
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
      <button disabled={busy} aria-pressed={followed} onClick={onToggle}>
        {followed ? '★ Tireur suivi' : '☆ Suivre ce tireur'}
      </button>
    </dialog>
  );
}
