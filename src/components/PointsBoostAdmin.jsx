import { useCallback, useEffect, useState } from 'react';
import API from '../api';
import BoostBadge from './BoostBadge';
import { boostRoundName } from '../lib/pointsBoost';

const SCOPES = [
  ['EVENT', 'Toute l’épreuve'],
  ['POOLS', 'Les poules'],
  ['TABLEAU', 'Tout le tableau'],
  ['ROUND', 'Un tour du tableau'],
  ['PODIUM', 'Le podium'],
];
const STANDARD_ROUNDS = ['T256', 'T128', 'T64', 'T32', 'T16', 'T8', 'T4', 'T2'];
const scopeText = (b) =>
  b.scope === 'ROUND'
    ? `Tour : ${boostRoundName(b.round)}`
    : `${SCOPES.find(([id]) => id === b.scope)?.[1]}${b.tournament ? ' (tout le tournoi)' : ''}`;
const stampedText = (s) =>
  s
    ? [
        s.matches && `${s.matches} match${s.matches > 1 ? 's' : ''}`,
        s.pools && `${s.pools} poule${s.pools > 1 ? 's' : ''}`,
        s.podium && 'le podium',
      ]
        .filter(Boolean)
        .join(', ') || 'aucun pronostic encore ouvert'
    : '';

// Points ×2 (Admin › Épreuve › Points et défis) : à partir de l'activation, les pronostics encore
// ouverts dans la portée choisie comptent double, et les joueurs qui suivent l'épreuve sont prévenus.
export default function PointsBoostAdmin({ competitionId, tournamentId, onRefresh }) {
  const [data, setData] = useState(null);
  const [scope, setScope] = useState('EVENT');
  const [round, setRound] = useState('');
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(
    async (signal) => {
      try {
        const { data } = await API.get(`/admin/boosts/${competitionId}`, { signal });
        setData(data);
      } catch (e) {
        if (!signal?.aborted) setMessage(e.response?.data?.error || 'Points ×2 indisponibles.');
      }
    },
    [competitionId],
  );
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setPending(null);
    load(c.signal);
    return () => c.abort();
  }, [load]);

  const rounds = [...new Set([...(data?.rounds || []), ...STANDARD_ROUNDS])].sort(
    (a, b) => Number(b.slice(1)) - Number(a.slice(1)),
  );
  const run = async (request, done) => {
    setBusy(true);
    setMessage('');
    try {
      const { data: out } = await request();
      setMessage(done(out));
      setPending(null);
      await load();
      onRefresh?.();
    } catch (e) {
      setMessage(e.response?.data?.error || 'Action impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };
  const actions = {
    activate: {
      text: () =>
        `Doubler les points sur ${scope === 'ROUND' ? boostRoundName(round) : SCOPES.find(([id]) => id === scope)[1].toLowerCase()} de ${data?.competition.name} ? Les joueurs qui suivent l’épreuve recevront une notification.`,
      go: () =>
        run(
          () => API.post(`/admin/boosts/${competitionId}`, { scope, ...(scope === 'ROUND' ? { round } : {}) }),
          (out) =>
            `Points ×2 activés (${stampedText(out.stamped)}). ${out.notified} appareil${out.notified > 1 ? 's' : ''} prévenu${out.notified > 1 ? 's' : ''}.`,
        ),
    },
    tournament: {
      text: () =>
        'Doubler les points sur toutes les épreuves du tournoi ? Une seule notification « Profite !! » par appareil.',
      go: () =>
        run(
          () => API.post(`/admin/tournament-boost/${tournamentId}`),
          (out) =>
            `Points ×2 activés sur ${out.competitions} épreuve${out.competitions > 1 ? 's' : ''}. ${out.notified} appareil${out.notified > 1 ? 's' : ''} prévenu${out.notified > 1 ? 's' : ''}.`,
        ),
    },
    tournamentOff: {
      text: () => 'Retirer le ×2 de tout le tournoi ? Les pronostics déjà clos gardent leurs points doublés.',
      go: () =>
        run(
          () => API.delete(`/admin/tournament-boost/${tournamentId}`),
          (out) => `Doublement retiré sur ${out.competitions} épreuve${out.competitions > 1 ? 's' : ''}.`,
        ),
    },
  };
  const remove = (b) => ({
    text: () => `Retirer « ${scopeText(b)} » ? Les pronostics déjà clos gardent leurs points doublés.`,
    go: () =>
      run(
        () => API.delete(`/admin/boosts/${competitionId}/${encodeURIComponent(b.key)}`),
        () => 'Doublement retiré pour les pronostics encore ouverts.',
      ),
  });

  return (
    <section className="feature-panel admin-boosts">
      <h3>
        Points ×2 <BoostBadge compact />
      </h3>
      <p className="muted">
        À partir de l’activation, les pronostics encore ouverts dans la portée choisie (et ceux publiés ensuite)
        comptent double : score, vainqueur, bonus outsider, défis, poules et podium. Ce qui est déjà clos garde ses
        points normaux.
      </p>
      {!data ? (
        <p className="muted">Chargement…</p>
      ) : (
        <>
          {data.boosts.length ? (
            <ul className="boost-list">
              {data.boosts.map((b) => (
                <li key={b.key}>
                  <span>
                    <strong>{scopeText(b)}</strong>
                    <small className="muted">
                      {' '}
                      · depuis le{' '}
                      {new Date(b.activatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </small>
                  </span>
                  <button className="button-secondary" disabled={busy} onClick={() => setPending(remove(b))}>
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucun doublement actif sur cette épreuve.</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPending(actions.activate);
            }}
          >
            <label>
              Doubler
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                {SCOPES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {scope === 'ROUND' && (
              <label>
                Tour
                <select required value={round} onChange={(e) => setRound(e.target.value)}>
                  <option value="">Choisir le tour</option>
                  {rounds.map((r) => (
                    <option key={r} value={r}>
                      {boostRoundName(r).replace(/^(le|la|les) /, '')}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button disabled={busy || (scope === 'ROUND' && !round)}>Activer les points ×2</button>
          </form>
          {tournamentId && (
            <p className="admin-boost-tournament">
              <button className="button-secondary" disabled={busy} onClick={() => setPending(actions.tournament)}>
                Doubler tout le tournoi
              </button>{' '}
              {data.boosts.some((b) => b.tournament) && (
                <button className="button-secondary" disabled={busy} onClick={() => setPending(actions.tournamentOff)}>
                  Retirer le ×2 du tournoi
                </button>
              )}
            </p>
          )}
        </>
      )}
      {pending && (
        <div className="inline-confirm" role="alertdialog" aria-label="Confirmation">
          <span>{pending.text()}</span>
          <button disabled={busy} onClick={pending.go}>
            Confirmer
          </button>
          <button className="button-secondary" disabled={busy} onClick={() => setPending(null)}>
            Annuler
          </button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
