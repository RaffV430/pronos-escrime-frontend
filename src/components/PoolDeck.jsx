import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../api';
import { UX_SAVE } from '../lib/uxFeatures';
import { CLOSED_REFUSAL_MESSAGE, dropWrite, isClosedRefusal, isNetworkError, queueWrite } from '../lib/outbox';
import { isFollowedFencer, useFencerFollows } from '../lib/fencerFollows';
import { stripLabel } from './matchPresentation';
import {
  activeFencers,
  deckOrder,
  fitsIndicator,
  picksFrom,
  poolDone,
  poolTotals,
  quickIndicators,
} from '../lib/poolDeck';
import './PoolDeck.css';

const STATUS = { ABSENT: 'Absent', MEDICAL: 'Retrait médical', EXCLUDED: 'Exclu' };
const signed = (v) => (v > 0 ? `+${v}` : String(v));
const errorText = (error) => error.response?.data?.error || 'Connexion impossible. Réessayez.';
const time = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Pronostics de poule « une poule par écran » : un toucher par tireur pour ses victoires (enregistré tout de
// suite), indice facultatif en valeurs rapides, contrôle du total de la poule, passage d'une poule à l'autre par
// les flèches, les points d'avancement ou un balayage. Mêmes règles de clôture que la saisie détaillée.
export default function PoolDeck({ pools, now, onRefresh }) {
  const follows = useFencerFollows();
  const hasMine = (pool) => pool.fencers.some((f) => isFollowedFencer(follows, f.name, f.club));
  const anyMine = pools.some(hasMine);
  const [mineFirst, setMineFirst] = useState(true);
  const order = deckOrder(pools, { mineFirst: mineFirst && anyMine, hasMine });
  const [currentId, setCurrentId] = useState(null);
  const current = order.find((p) => p.id === currentId) || order[0];
  const [picks, setPicks] = useState(() => picksFrom(pools));
  const [saving, setSaving] = useState({});
  const [notes, setNotes] = useState({});
  const [openIndicator, setOpenIndicator] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const savingRef = useRef(saving);
  savingRef.current = saving;
  // Poules relues au serveur (pronostics modifiés) : pronostics enregistrés repris, sauf ceux en cours d'envoi.
  const serverKey = pools
    .flatMap((p) => p.fencers.map((f) => `${f.id}:${f.prediction?.updatedAt || ''}:${f.prediction?.wins ?? ''}`))
    .join('|');
  useEffect(() => {
    const fresh = picksFrom(pools);
    setPicks((old) => {
      const next = { ...fresh };
      for (const id of Object.keys(savingRef.current)) if (old[id]) next[id] = old[id];
      return next;
    });
  }, [serverKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setOpenIndicator(null);
    setConfirmRemove(null);
  }, [current?.id]);

  const poolClosed = (pool) =>
    pool.isFinal || pool.isClosed || (pool.lockMode !== 'FIRST_RESULT' && new Date(pool.closesAt).getTime() <= now);
  const fencerOpen = (pool, f) =>
    !f.status && !poolClosed(pool) && !f.firstResultAt && !f.isClosed && !pool.sourceUnavailable;
  const done = (pool) => poolDone(pool, picks, (f) => fencerOpen(pool, f));

  async function send(pool, fencer, next) {
    const key = `pool:${fencer.id}`;
    const url = `/pools/${pool.id}/fencers/${fencer.id}/prediction`;
    const previous = picks[fencer.id];
    setPicks((p) => {
      const copy = { ...p };
      if (next) copy[fencer.id] = next;
      else delete copy[fencer.id];
      return copy;
    });
    setSaving((s) => ({ ...s, [fencer.id]: true }));
    setNotes((n) => ({ ...n, [fencer.id]: '' }));
    const bouts = pool.fencers.length - 1;
    const body = next && { wins: next.wins, losses: bouts - next.wins, indicator: next.indicator ?? null };
    try {
      if (next) await API.put(url, body);
      else await API.delete(url);
      dropWrite(key);
      window.dispatchEvent(new Event(UX_SAVE));
    } catch (error) {
      if (next && isNetworkError(error)) {
        queueWrite({ key, method: 'put', url, data: body });
        setNotes((n) => ({ ...n, [fencer.id]: 'Pas de réseau : envoyé automatiquement au retour de la connexion.' }));
      } else {
        setPicks((p) => {
          const copy = { ...p };
          if (previous) copy[fencer.id] = previous;
          else delete copy[fencer.id];
          return copy;
        });
        setNotes((n) => ({
          ...n,
          [fencer.id]: isClosedRefusal(error.response?.status) ? CLOSED_REFUSAL_MESSAGE : errorText(error),
        }));
        if (isClosedRefusal(error.response?.status)) onRefresh({ force: true });
      }
    } finally {
      setSaving((s) => {
        const copy = { ...s };
        delete copy[fencer.id];
        return copy;
      });
    }
  }
  const chooseWins = (pool, fencer, wins) => {
    if (saving[fencer.id]) return; // envoi en cours : le choix suivant attend la réponse
    const old = picks[fencer.id];
    // Nombre déjà choisi : rien ne change (un toucher maladroit ne retire jamais un pronostic).
    if (old?.wins === wins) return;
    const bouts = pool.fencers.length - 1;
    const indicator = fitsIndicator(old?.indicator, wins, bouts) ? (old?.indicator ?? null) : null;
    if (old?.indicator != null && indicator === null)
      setTimeout(() =>
        setNotes((n) => ({ ...n, [fencer.id]: 'Indice retiré : impossible avec ce nombre de victoires.' })),
      );
    return send(pool, fencer, { wins, indicator });
  };
  const removePick = (pool, fencer) => {
    setConfirmRemove(null);
    if (!picks[fencer.id] || saving[fencer.id]) return;
    setOpenIndicator(null);
    send(pool, fencer, null);
  };
  const chooseIndicator = (pool, fencer, indicator) => {
    const old = picks[fencer.id];
    if (!old || saving[fencer.id]) return;
    setOpenIndicator(null);
    send(pool, fencer, { wins: old.wins, indicator: old.indicator === indicator ? null : indicator });
  };

  const index = current ? order.indexOf(current) : -1;
  const go = (step) => {
    const target = order[index + step];
    if (target) setCurrentId(target.id);
  };
  const touch = useRef(null);
  // Changement de poule : la poule entière revient à l'écran (en-tête compris).
  const deckRef = useRef(null);
  const firstShown = useRef(true);
  useEffect(() => {
    if (firstShown.current) {
      firstShown.current = false;
      return;
    }
    deckRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }, [current?.id]);
  const progress = useMemo(() => pools.filter(done).length, [pools, picks, now]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return <p className="pool-empty">Aucune poule à pronostiquer pour le moment.</p>;
  const bouts = current.fencers.length - 1;
  const totals = poolTotals(current, picks);
  const closed = poolClosed(current);
  return (
    <section
      className="pool-deck"
      ref={deckRef}
      aria-label={`Pronostic de la ${current.name}. Enregistrement automatique à chaque choix ; balayez pour changer de poule.`}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="deck-head">
        <button
          type="button"
          className="deck-arrow"
          aria-label="Poule précédente"
          onClick={() => go(-1)}
          disabled={index <= 0}
        >
          ‹
        </button>
        <div className="deck-title">
          <h3>
            {current.name} <small>· {current.fencers.length} tireurs</small>
          </h3>
          <p className="deck-meta">
            {[
              current.startsAt && `début ${time(current.startsAt)}`,
              current.strip && stripLabel(current.strip).toLowerCase(),
              closed
                ? 'pronostics clos'
                : current.lockMode === 'START_OR_FIRST_RESULT' && current.closesAt
                  ? `clôture ${time(current.closesAt)}`
                  : current.lockMode === 'FIRST_RESULT'
                    ? 'clôture au 1er résultat'
                    : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <button
          type="button"
          className="deck-arrow"
          aria-label="Poule suivante"
          onClick={() => go(1)}
          disabled={index >= order.length - 1}
        >
          ›
        </button>
      </div>
      <div className="deck-bar">
        <div className="deck-dots" role="group" aria-label="Poules">
          {order.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`deck-dot${done(p) ? ' is-done' : ''}${p.id === current.id ? ' is-current' : ''}${hasMine(p) ? ' is-mine' : ''}`}
              aria-label={`${p.name}${done(p) ? ', faite' : ''}${hasMine(p) ? ', avec un de vos tireurs' : ''}`}
              aria-current={p.id === current.id ? 'true' : undefined}
              onClick={() => setCurrentId(p.id)}
            />
          ))}
        </div>
        <span className="deck-progress" role="status">
          {progress}/{pools.length} faite{progress > 1 ? 's' : ''}
        </span>
      </div>
      {anyMine && (
        <label className="deck-mine">
          <input type="checkbox" checked={mineFirst} onChange={(e) => setMineFirst(e.target.checked)} /> Mes tireurs
          d’abord
        </label>
      )}
      {current.sourceUnavailable && !closed && (
        <p className="pool-pending" role="status">
          ⏳ Saisie suspendue : vérification du site officiel en attente.
        </p>
      )}
      {current.recomposedAt && !closed && (
        <p className="pool-recomposed" role="status">
          Poule modifiée sur le site officiel : pronostics à refaire.
        </p>
      )}
      <ul className="deck-fencers">
        {current.fencers.map((f) => {
          const pick = picks[f.id];
          const open = fencerOpen(current, f);
          const mine = isFollowedFencer(follows, f.name, f.club);
          return (
            <li key={f.id} className={open ? '' : 'is-closed'}>
              <div className="deck-fencer-head">
                <span className="deck-name">
                  {mine && <span className="club-star">★ </span>}
                  {f.name} {f.countryCode && <small>{f.countryCode}</small>}
                </span>
                <span className="deck-summary">
                  {f.status ? (
                    STATUS[f.status] || 'Hors poule'
                  ) : pick && open && confirmRemove === f.id ? (
                    // Retrait confirmé : un toucher involontaire n'efface jamais un pronostic.
                    <>
                      <span>Retirer ?</span>
                      <button type="button" className="deck-confirm" onClick={() => removePick(current, f)}>
                        Oui
                      </button>
                      <button type="button" className="deck-confirm is-cancel" onClick={() => setConfirmRemove(null)}>
                        Non
                      </button>
                    </>
                  ) : (
                    <>
                      {pick && open && (
                        <button
                          type="button"
                          className="deck-link deck-remove"
                          aria-label={`Retirer le pronostic de ${f.name}`}
                          onClick={() => setConfirmRemove(f.id)}
                        >
                          retirer
                        </button>
                      )}
                      {pick && <b>{pick.wins} V</b>}
                      {pick && open && (
                        <button
                          type="button"
                          className="deck-link"
                          aria-expanded={openIndicator === f.id}
                          onClick={() => setOpenIndicator(openIndicator === f.id ? null : f.id)}
                        >
                          {pick.indicator == null ? '+ indice' : `ind. ${signed(pick.indicator)}`}
                        </button>
                      )}
                      {pick && !open && pick.indicator != null && <span> · ind. {signed(pick.indicator)}</span>}
                      {!open && !pick && <span>{f.firstResultAt ? 'premier résultat publié' : 'clos'}</span>}
                    </>
                  )}
                </span>
              </div>
              {!f.status && (
                <div className="deck-chips" role="group" aria-label={`Victoires de ${f.name}`}>
                  {Array.from({ length: bouts + 1 }, (_, w) => (
                    <button
                      key={w}
                      type="button"
                      className="deck-chip"
                      aria-pressed={pick?.wins === w}
                      aria-label={`${w} victoire${w > 1 ? 's' : ''}`}
                      disabled={!open}
                      onClick={() => chooseWins(current, f, w)}
                    >
                      {pick?.wins === w && <span aria-hidden="true">✓</span>}
                      {w}
                    </button>
                  ))}
                </div>
              )}
              {openIndicator === f.id && pick && open && (
                <div className="deck-chips deck-indicators" role="group" aria-label={`Indice de ${f.name}`}>
                  {quickIndicators(pick.wins, bouts).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="deck-chip"
                      aria-pressed={pick.indicator === v}
                      onClick={() => chooseIndicator(current, f, v)}
                    >
                      {pick.indicator === v && <span aria-hidden="true">✓</span>}
                      {signed(v)}
                    </button>
                  ))}
                  {pick.indicator != null && (
                    <button
                      type="button"
                      className="deck-chip"
                      aria-label="Retirer l’indice"
                      onClick={() => chooseIndicator(current, f, pick.indicator)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
              {notes[f.id] && (
                <p className="deck-note" role="status">
                  {notes[f.id]}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {activeFencers(current).length > 0 && (
        <p className={`deck-total is-${totals.status}`} role="status">
          {totals.status === 'partial'
            ? `${totals.filled}/${totals.count} tireurs · ${totals.sum}${totals.expected ? `/${totals.expected}` : ''} victoires`
            : totals.status === 'ok'
              ? totals.expected
                ? `✓ Poule complète : ${totals.expected}/${totals.expected} victoires`
                : 'Poule complète'
              : `${totals.sum}/${totals.expected} victoires : à vérifier (${totals.expected} pour ${totals.count} tireurs)`}
        </p>
      )}
    </section>
  );
}
