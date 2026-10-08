import { useState, useEffect } from 'react';
import API from '../api';
import DuelView from './DuelView';
import ClubLeague from './ClubLeague';
import { withCount } from '../lib/plural';
import { invitationFromPath, invitationUrl } from '../lib/invitation';
function Ranking({ rows, onDuel, userId }) {
  return (
    <ol className="ranking-list">
      {rows.map((r) => (
        <li key={r.id}>
          <span>
            #{r.rank} · {r.name}
          </span>
          <strong>
            {Number.isInteger(r.totalPoints) ? r.totalPoints : r.totalPoints.toFixed(2)} pts
            {r.members ? ` · ${r.members} membres` : ''}
            {onDuel && r.id !== userId && (
              <button className="button-secondary duel-button" onClick={() => onDuel(r)}>
                Duel
              </button>
            )}
          </strong>
        </li>
      ))}
    </ol>
  );
}
// Communauté : mes groupes d'amis et clubs (permanents) avec leur lien d'invitation et leur classement
// par tournoi ou sur la saison, création et adhésion, puis le classement des clubs et les défis d'un tournoi.
export default function Community({ tournamentId: preferred = null, userId }) {
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
    [kind, setKind] = useState('PRIVATE'),
    [code, setCode] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
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
  // Clubs d'abord, puis les délégations d'amis, les plus récents en premier.
  const ordered = [...(leagues || [])].sort(
    (x, y) => Number(y.kind === 'CLUB') - Number(x.kind === 'CLUB') || y.id - x.id,
  );
  const scoped = (scope) => (scope ? `?tournamentId=${scope}` : '');
  const openDetail = (leagueId, scope) =>
    action(async () => {
      setDetailScope(scope);
      setDuel(null);
      setDetail((await API.get(`/community/leagues/${leagueId}${scoped(scope)}`)).data);
    });
  return (
    <section className="feature-panel community-panel">
      {!!leagues?.length && (
        <section className="delegation-favorites" aria-label="Ma délégation favorite">
          <h2>Ma délégation favorite</h2>
          <p>Elle apparaît sur votre accueil.</p>
          {leagues.map((l) => (
            <button
              className="button-secondary"
              key={l.id}
              disabled={favoriteBusy}
              aria-pressed={favoriteId === l.id}
              onClick={() => favorite(l.id)}
            >
              <svg
                className={`delegation-foil ${favoriteId === l.id ? 'is-favorite' : ''}`}
                aria-hidden="true"
                width="30"
                height="30"
                viewBox="0 0 30 30"
              >
                <path d="M5 25L25 5M4 19L11 26M3 27L6 24" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle className="foil-tip" cx="25" cy="5" r="3" />
              </svg>
              {l.name}
              {favoriteId === l.id ? ' · Favorite' : ''}
            </button>
          ))}
        </section>
      )}
      <h2>Délégations d’amis et clubs</h2>
      <p>
        Créés une fois, ils durent toute la saison : invitez vos proches avec le lien, puis suivez le classement sur
        chaque tournoi ou sur la saison entière. Après chaque match, comparez-vous en duel.
      </p>
      {message && <p role="status">{message}</p>}
      <ClubLeague onJoined={() => setRevision((n) => n + 1)} />
      <h3>Mes délégations et clubs</h3>
      {!leagues && <p className="muted">Chargement…</p>}
      {leagues?.length === 0 && (
        <p className="muted">
          Aucune délégation ni club pour l’instant. Créez-en un ci-dessous : son lien d’invitation, à envoyer par
          WhatsApp ou SMS, apparaîtra ici.
        </p>
      )}
      {ordered.map((l) => (
        <article className="prediction-summary" key={l.id}>
          <strong>{l.name}</strong> · {l.kind === 'CLUB' ? 'Club' : 'Délégation privée'} ·{' '}
          {withCount(l._count.members, 'membre')}
          <p>
            Code d’invitation : <code>{l.code}</code>
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
          <button
            disabled={busy}
            onClick={() => openDetail(l.id, detail?.league.id === l.id ? detailScope : String(preferred || ''))}
          >
            Voir le classement
          </button>
          {l.ownerId !== userId && (
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
      {detail && (
        <div className="feature-panel">
          <h3>{detail.league.name}</h3>
          <label className="community-tournament">
            Classement
            <select value={detailScope} onChange={(e) => openDetail(detail.league.id, e.target.value)}>
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
        </div>
      )}
      <div className="feature-grid">
        <form
          className="feature-panel"
          onSubmit={(e) => {
            e.preventDefault();
            action(async () => {
              await API.post('/community/leagues', { name, kind });
              setName('');
              setMessage(
                `${kind === 'CLUB' ? 'Club créé' : 'Délégation créée'}. Partagez son lien d’invitation avec vos proches.`,
              );
            });
          }}
        >
          <h3>Créer une délégation d’amis ou un club</h3>
          <label>
            Nom
            <input value={name} minLength={3} maxLength={80} required onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="PRIVATE">Délégation d’amis</option>
              <option value="CLUB">Club</option>
            </select>
          </label>
          <p className="muted">
            {kind === 'CLUB'
              ? 'Club : une note par club (moyenne de ses membres), comparée aux autres clubs. Un seul club à la fois.'
              : 'Délégation privée : chacun est classé avec ses points ; duels entre membres.'}
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
      <p>
        Moyenne des points de tous les membres, y compris ceux à zéro ; 3 membres au moins. La composition de chaque
        club est figée au début du tournoi : une arrivée ou un départ compte à partir du tournoi suivant.
      </p>
      {clubs.length ? <Ranking rows={clubs} /> : <p>Aucun club éligible pour ce tournoi.</p>}
      {import.meta.env.DEV && (
        <section className="club-duel-preview" aria-labelledby="club-duel-title">
          <p className="arena-eyebrow">APERÇU · DONNÉES D’EXEMPLE</p>
          <h3 id="club-duel-title">Duel entre clubs</h3>
          <p>Étampes · Fleuret cadets · Tableau de 32</p>
          <div className="club-duel-score">
            <div><span className="club-duel-avatar">PA</span><h4>Club Paris</h4><strong>128 <small>pts</small></strong><p>6 joueurs</p></div>
            <span className="muted">VS</span>
            <div><span className="club-duel-avatar rival">ME</span><h4>Club Melun</h4><strong>116 <small>pts</small></strong><p>6 joueurs</p></div>
          </div>
          <p className="club-duel-lead">Club Paris mène de 12 points</p>
          <div className="club-duel-progress" aria-label="Répartition des points : Paris 52 %, Melun 48 %"><span /></div>
          <p className="muted">Proposition : mêmes épreuves et même nombre de joueurs par club. Points définitifs après les résultats officiels.</p>
          <button disabled>Voir les contributions · aperçu</button>
        </section>
      )}
      <h4>Défis du tournoi</h4>
      <p>
        Choisissez un vainqueur pour gagner 3 points bonus. Le barème est fixé à la création ; clôture au début prévu du
        match, ou plus tôt si le résultat est publié. Aucun bonus avant un résultat définitif.
      </p>
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
