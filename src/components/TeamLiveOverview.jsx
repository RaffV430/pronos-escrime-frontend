import { useEffect, useState } from 'react';
import { useLiveScores, clockLabel } from '../lib/useLiveScores';
import { useNow } from '../lib/polling';
import API from '../api';
import { livePredictionLabel } from '../lib/livePistes';
import { teamMatchForRow, teamLiveRows } from '../lib/teamLiveOverview';
import { eventNameFr } from '../lib/eventName';
import { roundLabel } from './matchPresentation';
import './live-pistes.css';
const label = (row) => (row.gender === 'men' ? 'Hommes' : row.gender === 'women' ? 'Femmes' : row.competitionName);
export default function TeamLiveOverview({ competition, matches = [], userId, selectedId, onSelect }) {
  const scores = useLiveScores(competition?.id, Boolean(competition?.id), true);
  const now = useNow(5000);
  const [gender, setGender] = useState('');
  const [selected, setSelected] = useState(null);
  const all = teamLiveRows(scores, { now });
  const rows = teamLiveRows(scores, { gender, selected, now });
  const [loaded, setLoaded] = useState(null);
  const eventIds = [...new Set(all.map((r) => r.competitionId).filter((id) => id && id !== competition?.id))]
    .sort()
    .join(',');
  const matchIds = all
    .filter((r) => r.competitionId !== competition?.id)
    .map((r) => r.officialMatchId)
    .sort()
    .join(',');
  const scope = `${competition?.id}:${eventIds}:${matchIds}:${userId}`;
  useEffect(() => {
    const controller = new AbortController();
    setLoaded(null);
    if (eventIds)
      Promise.all(
        eventIds.split(',').map((id) => API.get(`/matches?competitionId=${id}`, { signal: controller.signal })),
      )
        .then((results) => {
          if (!controller.signal.aborted) setLoaded({ scope, matches: results.flatMap((r) => r.data) });
        })
        .catch(() => {});
    return () => controller.abort();
  }, [eventIds, userId, scope]);
  const knownMatches = [...matches, ...(loaded?.scope === scope ? loaded.matches : [])];
  const toggle = (id, checked) =>
    setSelected((before) => {
      const next = new Set(before || all.map((r) => r.matchId));
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  return (
    <section className="feature-panel live-pistes team-live-overview" aria-labelledby="team-live-title">
      <h2 id="team-live-title">
        Direct par équipes <span>({rows.length})</span>
      </h2>
      <div className="team-live-toolbar">
        <label>
          Épreuves{' '}
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Hommes et Femmes</option>
            <option value="men">Hommes</option>
            <option value="women">Femmes</option>
          </select>
        </label>
        <details className="team-live-choices">
          <summary>Choisir les matchs à afficher</summary>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setSelected(null);
              setGender('');
            }}
          >
            Tout afficher
          </button>
          {!all.length && <p>Aucune piste identifiée pour le moment.</p>}
          {all.map((r) => (
            <label className="check-row" key={r.matchId}>
              <input
                type="checkbox"
                checked={!selected || selected.has(r.matchId)}
                onChange={(e) => toggle(r.matchId, e.target.checked)}
              />
              <span>
                {label(r)} · {r.player1} – {r.player2} · Piste {r.strip}
              </span>
            </label>
          ))}
        </details>
      </div>
      {!rows.length && (
        <p role="status">
          {all.length
            ? 'Aucun match ne correspond à votre sélection.'
            : 'Aucune piste récente identifiée. Les compositions officielles sont nécessaires pour distinguer les épreuves.'}
        </p>
      )}
      <div className="live-pistes-grid">
        {rows.map((r) => {
          const linked = teamMatchForRow(r, knownMatches);
          const Card = linked && onSelect ? 'button' : 'article';
          return (
            <Card
              className="live-pistes-card"
              key={r.matchId}
              {...(Card === 'button'
                ? {
                    type: 'button',
                    'aria-pressed': linked.match.id === selectedId,
                    onClick: () => onSelect(r, linked.match),
                  }
                : {})}
            >
              <p className="team-live-event">{eventNameFr(r.competitionName).replace(/Dames/g, 'Femmes')}</p>
              <div className="live-pistes-meta">
                <strong>
                  {r.round === 'T8' ? 'Quarts de finale' : r.round ? roundLabel(r.round) : 'Tour non identifié'}
                </strong>
                <span>Piste {r.strip}</span>
              </div>
              <div className="live-pistes-duel team-live-duel">
                {[1, 2].map((i) => (
                  <span key={i}>
                    <span>{r[`player${i}`]}</span>
                    <small>{r[`player${i}Country`]}</small>
                    <span className="team-live-fencer">En piste : {r[`fencer${i}`]?.name || 'non transmis'}</span>
                    <b
                      className={`live-pistes-number lamp-${i}${r[`fencer${i}`]?.lamp ? ' is-lit' : r[`fencer${i}`]?.white ? ' is-white' : ''}`}
                    >
                      {r[`score${i}`] ?? '—'}
                    </b>
                  </span>
                ))}
              </div>
              <p className="live-pistes-prediction">
                {linked
                  ? livePredictionLabel(linked.match, linked.live, userId)
                  : 'Pronostic indisponible · rencontre non chargée'}
              </p>
              <div className="live-pistes-meta">
                <span>
                  {clockLabel(r.clock)}
                  {r.period ? ` · Période ${r.period}` : ''}
                </span>
                <span>Signal à {new Date(r.updatedAt).toLocaleTimeString('fr-FR')}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
