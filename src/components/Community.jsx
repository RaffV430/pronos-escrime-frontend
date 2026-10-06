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
export default function Community({ tournamentId, competitionId, userId }) {
  const [leagues, setLeagues] = useState([]),
    [elsewhere, setElsewhere] = useState([]),
    [clubs, setClubs] = useState([]),
    [challenges, setChallenges] = useState([]),
    [detail, setDetail] = useState(null),
    [duel, setDuel] = useState(null),
    [name, setName] = useState(''),
    [kind, setKind] = useState('PRIVATE'),
    [code, setCode] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      API.get('/community/leagues', { signal: c.signal }),
      API.get(`/community/clubs/${tournamentId}`, { signal: c.signal }),
      API.get(`/community/challenges?competitionId=${competitionId}`, { signal: c.signal }),
    ])
      .then(([a, b, d]) => {
        if (!c.signal.aborted) {
          setLeagues(a.data.filter((l) => l.tournamentId === tournamentId));
          setElsewhere(a.data.filter((l) => l.tournamentId !== tournamentId));
          setClubs(b.data);
          setChallenges(d.data);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setMessage(e.response?.data?.error || 'Chargement impossible.');
      });
    return () => c.abort();
  }, [tournamentId, competitionId, revision]);
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
  return (
    <section className="feature-panel">
      <h2>Entre amis et clubs</h2>
      <p>
        Les ligues reprennent les points du tournoi sélectionné, y compris ceux obtenus avant l’inscription. Vos
        pronostics restent personnels jusqu’à la fin de chaque match ; ensuite, les membres d’une même ligue peuvent se
        comparer en duel.
      </p>
      <ClubLeague tournamentId={tournamentId} onJoined={() => setRevision((n) => n + 1)} />
      <button onClick={() => setRevision((n) => n + 1)}>Actualiser l’affichage</button>
      {message && <p role="status">{message}</p>}
      <h3>Mes groupes pour ce tournoi</h3>
      {!leagues.length && (
        <p className="muted">
          Aucun groupe pour ce tournoi. Créez-en un ci-dessous : son lien d’invitation, à envoyer par WhatsApp ou SMS,
          apparaîtra ici.
          {elsewhere.length > 0 &&
            ` Vous avez ${withCount(elsewhere.length, 'groupe')} sur d’autres tournois : choisissez le tournoi correspondant pour les voir.`}
        </p>
      )}
      {leagues.map((l) => (
        <article className="prediction-summary" key={l.id}>
          <strong>{l.name}</strong> · {l.kind === 'CLUB' ? 'Club' : 'Ligue privée'} ·{' '}
          {withCount(l._count.members, 'membre')}
          <p>
            Code d’invitation : <code>{l.code}</code>
          </p>
          <button
            className="button-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(invitationUrl(l.code));
                setMessage('Lien d’invitation copié : il suffit de l’ouvrir pour rejoindre le groupe.');
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
            onClick={() => action(async () => setDetail((await API.get(`/community/leagues/${l.id}`)).data))}
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
                  setMessage('Groupe quitté.');
                })
              }
            >
              Quitter
            </button>
          )}
        </article>
      ))}
      <div className="feature-grid">
        <form
          className="feature-panel"
          onSubmit={(e) => {
            e.preventDefault();
            action(async () => {
              await API.post('/community/leagues', { name, kind, tournamentId });
              setName('');
              setMessage('Groupe créé. Partagez son lien d’invitation avec vos proches.');
            });
          }}
        >
          <h3>Créer un groupe</h3>
          <label>
            Nom du groupe
            <input value={name} minLength={3} maxLength={80} required onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="PRIVATE">Ligue privée</option>
              <option value="CLUB">Club</option>
            </select>
          </label>
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
          <h3>Rejoindre un groupe</h3>
          <label>
            Lien ou code d’invitation
            <input value={code} required onChange={(e) => setCode(e.target.value)} />
          </label>
          <button disabled={busy}>Rejoindre</button>
        </form>
      </div>
      {detail && (
        <div className="feature-panel">
          <h3>{detail.league.name}</h3>
          <p className="muted">Comparez-vous match par match avec un membre : bouton « Duel ».</p>
          <Ranking
            rows={detail.ranking}
            userId={userId}
            onDuel={(r) =>
              action(async () => setDuel((await API.get(`/community/leagues/${detail.league.id}/duel/${r.id}`)).data))
            }
          />
          {duel && duel.league.id === detail.league.id && <DuelView duel={duel} onClose={() => setDuel(null)} />}
        </div>
      )}
      <h3>Classement des clubs</h3>
      <p>
        Moyenne des points de tous les membres, y compris ceux à zéro. Minimum 3 membres ; un seul club par joueur. Les
        inscriptions et départs sont figés au début du tournoi.
      </p>
      {clubs.length ? <Ranking rows={clubs} /> : <p>Aucun club éligible pour ce tournoi.</p>}
      <h3>Défis de l’épreuve</h3>
      <p>
        Choisissez un vainqueur pour gagner 3 points bonus. Le barème est fixé à la création ; clôture au début prévu du
        match, ou plus tôt si le résultat est publié. Aucun bonus avant un résultat définitif.
      </p>
      {!challenges.length && <p>Aucun défi proposé pour cette épreuve.</p>}
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
