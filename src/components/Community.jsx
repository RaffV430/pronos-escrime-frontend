import ClubProfile from './ClubProfile';
import { scopeLabels, sectionChoices, selectedSections, toggleSection } from '../lib/delegationScope';
import { useState, useEffect, useRef } from 'react';
import { PistePodium } from './PisteExperience';
import API from '../api';
import DuelView from './DuelView';
import { withCount } from '../lib/plural';
import { invitationFromPath, invitationUrl } from '../lib/invitation';
function ParticipationChoices({ legend, value, disabled, onChange }) {
  return (
    <fieldset className="delegation-participation">
      <legend>{legend}</legend>
      <small>Cochez les sections souhaitées (au moins une).</small>
      {Object.entries(sectionChoices).map(([scope, label]) => (
        <label key={scope} className="delegation-participation-choice">
          <input
            type="checkbox"
            checked={selectedSections(value).includes(scope)}
            disabled={disabled}
            onChange={() => onChange(toggleSection(value, scope))}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
function Ranking({ rows, onDuel, userId }) {
  const me = rows.find((r) => r.id === userId);
  const ahead = me && rows.findLast((r) => r.totalPoints > me.totalPoints);
  const points = (value) => Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  return (
    <div className="delegation-ranking">
      <PistePodium rows={rows} />
      {me && (
        <div className="delegation-my-progress">
          <span>
            <small>Votre position</small>
            <strong>#{me.rank}</strong>
          </span>
          <span>
            <small>Votre score</small>
            <strong>{points(me.totalPoints)} pts</strong>
          </span>
          <span>
            <small>Prochain objectif</small>
            <strong>
              {ahead
                ? `${points(ahead.totalPoints - me.totalPoints)} pts pour rejoindre ${ahead.name}`
                : 'Vous êtes en tête !'}
            </strong>
          </span>
        </div>
      )}
      <ol className="delegation-rankings-list">
        {rows.map((r) => (
          <li key={r.id} className={r.id === userId ? 'is-me' : ''}>
            <span className="delegation-rank-number">{r.rank}</span>
            <span className="delegation-member">
              <strong>
                {r.name}
                {r.id === userId ? ' · Vous' : ''}
              </strong>
              <small>
                {r.members
                  ? `${r.members} membres`
                  : r.rank === 1
                    ? 'En tête'
                    : `${points(rows[0].totalPoints - r.totalPoints)} pts de la tête`}
              </small>
              {r.predictionScope && <small>{scopeLabels[r.predictionScope]}</small>}
              <span className="delegation-score-track">
                <span
                  style={{
                    width: `${rows[0].totalPoints ? Math.max(0, Math.min(100, (r.totalPoints / rows[0].totalPoints) * 100)) : 0}%`,
                  }}
                />
              </span>
            </span>
            <strong className="delegation-member-score">
              {points(r.totalPoints)} <small>pts</small>
            </strong>
            {onDuel && r.id !== userId && (
              <button
                className="button-secondary duel-button"
                aria-label={`Duel avec ${r.name}`}
                onClick={() => onDuel(r)}
              >
                Duel
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
// Communauté : mes groupes d'amis et clubs (permanents) avec leur lien d'invitation et leur classement
// par tournoi ou sur la saison, création et adhésion, puis le classement des clubs et les défis d'un tournoi.
export default function Community({ tournamentId: preferred = null, userId, onPronosticate }) {
  const rankingSection = useRef(null);
  const [favoriteId, setFavoriteId] = useState(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [leagues, setLeagues] = useState(null),
    [tournaments, setTournaments] = useState([]),
    [selected, setSelected] = useState(preferred ? String(preferred) : ''),
    [clubs, setClubs] = useState([]),
    [challenges, setChallenges] = useState([]),
    [detail, setDetail] = useState(null),
    [detailScope, setDetailScope] = useState(''),
    [duel, setDuel] = useState(null),
    [name, setName] = useState(''),
    [predictionScope, setPredictionScope] = useState('ALL'),
    [code, setCode] = useState(''),
    [invitations, setInvitations] = useState([]),
    [invitees, setInvitees] = useState({}),
    [inviteNotes, setInviteNotes] = useState({}),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => {
      setRevision((n) => n + 1);
      setDetail(null);
    };
    window.addEventListener('club-profile-changed', changed);
    return () => window.removeEventListener('club-profile-changed', changed);
  }, []);
  useEffect(() => {
    const c = new AbortController();
    API.get('/community/favorite', { signal: c.signal })
      .then(({ data }) => setFavoriteId(data.leagueId))
      .catch(() => {});
    return () => c.abort();
  }, []);
  const favorite = async (leagueId) => {
    setFavoriteBusy(true);
    try {
      const { data } = await API.put('/community/favorite', { leagueId: favoriteId === leagueId ? null : leagueId });
      setFavoriteId(data.leagueId);
    } catch (e) {
      setMessage(e.response?.data?.error || 'Préférence non enregistrée.');
    } finally {
      setFavoriteBusy(false);
    }
  };
  useEffect(() => {
    const c = new AbortController();
    Promise.all([API.get('/community/leagues', { signal: c.signal }), API.get('/tournaments', { signal: c.signal })])
      .then(([a, t]) => {
        if (c.signal.aborted) return;
        const list = Array.isArray(t.data) ? t.data : [];
        setLeagues(a.data);
        setTournaments(list);
        const first = String(list.find((x) => !x.archivedAt)?.id || list[0]?.id || '');
        setSelected((old) => old || first);
      })
      .catch((e) => {
        if (!c.signal.aborted) setMessage(e.response?.data?.error || 'Chargement impossible.');
      });
    // Invitations reçues par nom d'utilisateur (facultatif : une erreur ne bloque pas la page).
    API.get('/community/invitations', { signal: c.signal })
      .then(({ data }) => !c.signal.aborted && setInvitations(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => c.abort();
  }, [revision]);
  useEffect(() => {
    if (!selected) return;
    const c = new AbortController();
    Promise.all([
      API.get(`/community/clubs/${selected}`, { signal: c.signal }),
      API.get(`/community/challenges?tournamentId=${selected}`, { signal: c.signal }),
    ])
      .then(([b, d]) => {
        if (c.signal.aborted) return;
        setClubs(b.data);
        setChallenges(d.data);
      })
      .catch(() => {});
    return () => c.abort();
  }, [selected, revision]);
  const action = async (fn) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await fn();
      setRevision((n) => n + 1);
    } catch (e) {
      setMessage(e.response?.data?.error || 'Opération impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  // Invitation par nom d'utilisateur : réponse affichée sous le champ, là où le membre regarde.
  const invite = async (leagueId) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await API.post(`/community/leagues/${leagueId}/invitations`, {
        username: invitees[leagueId] || '',
      });
      setInvitees((old) => ({ ...old, [leagueId]: '' }));
      setInviteNotes((old) => ({ ...old, [leagueId]: { text: data.message } }));
    } catch (e) {
      const text = e.response?.data?.error || 'Invitation impossible. Réessayez.';
      setInviteNotes((old) => ({ ...old, [leagueId]: { text, failed: true } }));
    } finally {
      setBusy(false);
    }
  };
  // Clubs d'abord, puis les délégations d'amis, les plus récents en premier.
  const ordered = [...(leagues || [])].sort(
    (x, y) => Number(y.kind === 'CLUB') - Number(x.kind === 'CLUB') || y.id - x.id,
  );
  const scoped = (scope) => (scope ? `?tournamentId=${scope}` : '');
  const openDetail = (leagueId, scope) =>
    action(async () => {
      setDuel(null);
      const { data } = await API.get(`/community/leagues/${leagueId}${scoped(scope)}`);
      setDetailScope(scope);
      setDetail(data);
    });
  useEffect(() => {
    const requested = Number(new URLSearchParams(location.search).get('league'));
    if (!Number.isSafeInteger(requested) || requested <= 0 || !leagues?.some((league) => league.id === requested))
      return;
    const controller = new AbortController();
    API.get(`/community/leagues/${requested}`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setDetailScope('');
        setDetail(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage('Classement momentanément indisponible.');
      });
    return () => controller.abort();
  }, [leagues]);
  const detailId = detail?.league?.id;
  useEffect(() => {
    if (detailId) rankingSection.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [detailId]);
  return (
    <section className="feature-panel community-panel">
      <header className="delegations-page-heading">
        <div>
          <p className="arena-eyebrow">L’ESPRIT CLUB</p>
          <h1>Mes délégations</h1>
          <p>Vos proches, vos points, vos duels.</p>
        </div>
        <span className="delegation-count">
          {leagues?.length || 0} {leagues?.length === 1 ? 'délégation' : 'délégations'}
        </span>
      </header>
      {message && <p role="status">{message}</p>}
      <p className="muted delegation-help">
        Ouvrez un classement ou choisissez votre favorite : elle dispose de sa propre carte sur l’accueil.
      </p>
      {invitations.length > 0 && (
        <section className="delegation-invitations" aria-label="Invitations reçues">
          <h2>Invitations reçues</h2>
          {invitations.map((i) => (
            <article className="delegation-invitation" key={i.id}>
              <p>
                {i.invitedBy ? <strong>{i.invitedBy}</strong> : 'Un membre'} vous invite à rejoindre{' '}
                <strong>« {i.league.name} »</strong> · {withCount(i.league.members, 'membre')}
              </p>
              <div className="delegation-invitation-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      const { data } = await API.post(`/community/invitations/${i.id}/accept`);
                      setMessage(data.message);
                    })
                  }
                >
                  Accepter
                </button>
                <button
                  className="button-secondary"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await API.post(`/community/invitations/${i.id}/decline`);
                      setMessage('Invitation refusée.');
                    })
                  }
                >
                  Refuser
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {!leagues && <p className="muted">Chargement…</p>}
      {leagues?.length === 0 && (
        <p className="muted">
          Aucune délégation ni club pour l’instant. Créez-en un ci-dessous : son lien d’invitation, à envoyer par
          WhatsApp ou SMS, apparaîtra ici.
        </p>
      )}
      <div className="delegation-cards">
        {ordered.map((l) => (
          <article className="delegation-card" key={l.id} aria-label={l.name}>
            <div className="delegation-card-heading">
              <span className="delegation-card-avatar" aria-hidden="true">
                {l.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h2>{l.name}</h2>
                <p>
                  {l.kind === 'CLUB' ? 'Club' : 'Délégation d’amis'} · {withCount(l._count.members, 'membre')}
                </p>
              </div>
            </div>
            <button
              className="button-secondary delegation-favorite-toggle"
              disabled={favoriteBusy}
              aria-pressed={favoriteId === l.id}
              aria-label={`${favoriteId === l.id ? 'Retirer des favorites' : 'Définir comme favorite'} : ${l.name}`}
              onClick={() => favorite(l.id)}
            >
              <svg
                className={`delegation-foil ${favoriteId === l.id ? 'is-favorite' : ''}`}
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 30 30"
              >
                <path d="M5 25L25 5M4 19L11 26M3 27L6 24" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle className="foil-tip" cx="25" cy="5" r="3" />
              </svg>
              {favoriteId === l.id ? 'Favorite' : 'Choisir comme favorite'}
            </button>
            <button
              className="delegation-open-ranking"
              disabled={busy}
              aria-expanded={detail?.league.id === l.id}
              onClick={() => openDetail(l.id, detail?.league.id === l.id ? detailScope : '')}
            >
              Voir le classement →
            </button>
            {l.registeredClub?.description && <p>{l.registeredClub.description}</p>}
            {l.kind === 'PRIVATE' && (
              <details className="delegation-preferences">
                <summary>Mes réglages de pronostics</summary>
                <ParticipationChoices
                  legend="Ma participation dans cette délégation"
                  value={l.members?.[0]?.predictionScope || 'ALL'}
                  disabled={busy}
                  onChange={(predictionScope) => {
                    if (predictionScope === (l.members?.[0]?.predictionScope || 'ALL')) return;
                    action(async () => {
                      await API.put(`/community/leagues/${l.id}/preferences`, { predictionScope });
                      setDetail(null);
                      setMessage('Votre choix est enregistré. Votre classement dans cette délégation est recalculé.');
                    });
                  }}
                />
                <p className="muted">
                  Ce choix vous concerne uniquement. Les points des sections choisies comptent dans cette délégation, y
                  compris ceux déjà obtenus. Votre classement général est conservé.
                </p>
              </details>
            )}
            {l.kind === 'PRIVATE' && onPronosticate && (
              <button className="button-secondary" onClick={() => onPronosticate(l)}>
                Pronostiquer avec mon choix →
              </button>
            )}

            <details className="delegation-share">
              <summary>Inviter des membres</summary>
              {l.kind === 'PRIVATE' && (
                <form
                  className="delegation-invite-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    invite(l.id);
                  }}
                >
                  <label>
                    Nom d’utilisateur
                    <input
                      value={invitees[l.id] || ''}
                      required
                      maxLength={80}
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => setInvitees((old) => ({ ...old, [l.id]: e.target.value }))}
                    />
                  </label>
                  <button disabled={busy}>Inviter</button>
                  {inviteNotes[l.id] ? (
                    <p
                      role="status"
                      className={inviteNotes[l.id].failed ? 'delegation-invite-error' : 'delegation-invite-ok'}
                    >
                      {inviteNotes[l.id].text}
                    </p>
                  ) : (
                    <p className="muted">La personne reçoit une invitation à accepter dans ses délégations.</p>
                  )}
                </form>
              )}
              <p>
                Code : <code>{l.code}</code>
              </p>
              <button
                className="button-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(invitationUrl(l.code));
                    setMessage('Lien d’invitation copié : il suffit de l’ouvrir pour rejoindre la délégation.');
                  } catch {
                    setMessage('Copiez le code affiché ci-dessus.');
                  }
                }}
              >
                Copier le lien d’invitation
              </button>
              <button
                className="button-secondary"
                onClick={async () => {
                  try {
                    if (navigator.share)
                      await navigator.share({
                        title: l.name,
                        text: `Rejoignez « ${l.name} » sur Pronos Escrime :`,
                        url: invitationUrl(l.code),
                      });
                    else {
                      await navigator.clipboard.writeText(invitationUrl(l.code));
                      setMessage('Lien d’invitation copié.');
                    }
                  } catch (e) {
                    if (e.name !== 'AbortError') setMessage('Copiez le code affiché ci-dessus.');
                  }
                }}
              >
                Inviter (WhatsApp, SMS…)
              </button>
            </details>
            {(l.kind === 'CLUB' || l.ownerId !== userId) && (
              <button
                className="button-secondary"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await API.post(`/community/leagues/${l.id}/leave`);
                    setDetail(null);
                    setMessage(l.kind === 'CLUB' ? 'Club quitté.' : 'Délégation quittée.');
                  })
                }
              >
                Quitter
              </button>
            )}
          </article>
        ))}
      </div>
      {detail && (
        <section
          ref={rankingSection}
          className="feature-panel delegation-detail"
          aria-label={`Classement de ${detail.league.name}`}
        >
          <p className="arena-eyebrow">LE CLASSEMENT · {detailScope ? 'TOURNOI' : 'SAISON'}</p>
          <h3>{detail.league.name}</h3>
          <label className="community-tournament">
            Classement
            <select disabled={busy} value={detailScope} onChange={(e) => openDetail(detail.league.id, e.target.value)}>
              <option value="">Toute la saison</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">Comparez-vous match par match avec un membre : bouton « Duel ».</p>
          {detail.ranking.length ? (
            <Ranking
              rows={detail.ranking}
              userId={userId}
              onDuel={(r) =>
                action(async () =>
                  setDuel(
                    (await API.get(`/community/leagues/${detail.league.id}/duel/${r.id}${scoped(detailScope)}`)).data,
                  ),
                )
              }
            />
          ) : (
            <p>Aucun point pour l’instant sur cette sélection.</p>
          )}
          {duel && duel.league.id === detail.league.id && <DuelView duel={duel} onClose={() => setDuel(null)} />}
        </section>
      )}
      <ClubProfile />
      <details className="delegation-manage">
        <summary>Créer ou rejoindre une délégation</summary>
        <div className="feature-grid">
          <form
            className="feature-panel"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await API.post('/community/leagues', { name, kind: 'PRIVATE', predictionScope });
                setName('');
                setMessage('Délégation créée. Partagez son lien d’invitation avec vos proches.');
              });
            }}
          >
            <h3>Créer une délégation d’amis</h3>
            <label>
              Nom
              <input value={name} minLength={3} maxLength={80} required onChange={(e) => setName(e.target.value)} />
            </label>
            <p className="muted">
              Délégation privée : chacun est classé avec ses points ; duels entre membres. Votre club se choisit dans
              Mon compte.
            </p>
            <ParticipationChoices
              legend="Ma participation"
              value={predictionScope}
              disabled={busy}
              onChange={setPredictionScope}
            />
            <p className="muted">
              Chaque membre fait son propre choix. Seuls les points de ses sections choisies comptent ici.
            </p>
            <button disabled={busy}>Créer</button>
          </form>
          <form
            className="feature-panel"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                // Code seul ou lien d'invitation complet collé.
                let value = code.trim();
                try {
                  value = invitationFromPath(new URL(value).pathname) || value;
                } catch {
                  /* simple code */
                }
                await API.post('/community/join', { code: value });
                setCode('');
                setMessage('Inscription confirmée.');
              });
            }}
          >
            <h3>Rejoindre une délégation ou un club</h3>
            <label>
              Lien ou code d’invitation
              <input value={code} required onChange={(e) => setCode(e.target.value)} />
            </label>
            <button disabled={busy}>Rejoindre</button>
          </form>
        </div>
      </details>
      <h3>Classement des clubs et défis</h3>
      <label className="community-tournament">
        Tournoi
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.archivedAt ? ' (terminé)' : ''}
            </option>
          ))}
        </select>
      </label>
      <h4>Classement des clubs</h4>
      {clubs.length ? <Ranking rows={clubs} /> : <p>Aucun club éligible pour ce tournoi.</p>}
      {import.meta.env.DEV && (
        <section className="club-duel-preview" aria-labelledby="club-duel-title">
          <p className="arena-eyebrow">APERÇU · DONNÉES D’EXEMPLE</p>
          <h3 id="club-duel-title">La course des clubs</h3>
          <p>Étampes · Fleuret cadets · Tableau de 32</p>
          <p>
            Avec plusieurs clubs, chacun figure au classement général. Un duel compare toujours deux clubs, tandis que
            la course commune les réunit tous.
          </p>
          <Ranking
            rows={[
              { leagueId: 'preview-paris', name: 'Club Paris', rank: 1, totalPoints: 128, members: 6 },
              { leagueId: 'preview-melun', name: 'Club Melun', rank: 2, totalPoints: 116, members: 6 },
              { leagueId: 'preview-lyon', name: 'Club Lyon', rank: 3, totalPoints: 109, members: 6 },
              { leagueId: 'preview-lille', name: 'Club Lille', rank: 4, totalPoints: 94, members: 6 },
            ]}
          />
          <p className="muted">
            Illustration avec quatre clubs et des points fictifs. Le classement réel au-dessus conserve son calcul
            actuel par moyenne ; cet aperçu ne distribue aucun point.
          </p>
          <button disabled>Voir les contributions · aperçu</button>
        </section>
      )}
      <h4>Défis du tournoi</h4>
      {!challenges.length && <p>Aucun défi proposé pour ce tournoi.</p>}
      {challenges.map((c) => (
        <article className="prediction-summary" key={c.id}>
          <h4>{c.name}</h4>
          <p>
            {c.match.player1} / {c.match.player2}
          </p>
          <p>
            Clôture : {new Date(c.closesAt).toLocaleString('fr-FR')} ({Intl.DateTimeFormat().resolvedOptions().timeZone}
            ) · {c.closed ? 'Clos' : 'Ouvert'}
          </p>
          {c.pick && (
            <p>
              Mon choix : {c.pick.winner === 1 ? c.match.player1 : c.match.player2}
              {c.match.isFinished ? ` · ${c.points} points` : ''}
            </p>
          )}
          <div className="filter-row">
            {[1, 2].map((w) => (
              <button
                key={w}
                disabled={busy || c.closed}
                aria-pressed={c.pick?.winner === w}
                onClick={() =>
                  action(async () => {
                    await API.post(`/community/challenges/${c.id}/pick`, { winner: w });
                    setMessage('Choix enregistré.');
                  })
                }
              >
                {c.match[`player${w}`]}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
