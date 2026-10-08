import { useFencerFollows } from '../lib/fencerFollows';
import CrowdTrend from './CrowdTrend';
import { matchTotal } from './resultPresentation';
import { roundLabel, stripLabel } from './matchPresentation';
import { useEffect, useRef, useState } from 'react';
import API from '../api';
import useLocalDraft, { draftKey } from './useLocalDraft';
import DraftNotice from './DraftNotice';
import { withCount } from '../lib/plural';
import MatchTiming from './MatchTiming';
import { groupMatches, isMatchClosed, isUpcoming, validateScores, nextMatchId } from './matchPresentation';
import { useNow } from '../lib/polling';
import { useClub } from '../lib/club';
import HeadToHead from './HeadToHead';
import MatchSocial from './MatchSocial';
import BracketTree from './BracketTree.jsx';
import { buildTree } from './bracketTree';

export default function MatchBoard({
  initialFilter = 'Tous',
  matches,
  userId,
  isAdmin = false,
  competitionId,
  now: fixedNow,
  ready,
  stale = false,
  onRefresh,
  onDirtyChange,
  focusTarget,
  onPreviewSave,
  onPreviewRemove,
}) {
  const clock = useNow(5000);
  const club = useClub();
  const follows = useFencerFollows();
  const now = fixedNow ?? clock;
  const deepLink = new URLSearchParams(location.search);
  const linkedIds =
    Number(deepLink.get('event')) === Number(competitionId)
      ? (deepLink.get('matches') || '')
          .split(',')
          .map(Number)
          .filter((n) => Number.isSafeInteger(n) && n > 0)
      : [];
  const [linkedNew, setLinkedNew] = useState(linkedIds);
  const [drafts, setDrafts] = useState({}),
    [messages, setMessages] = useState({}),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState(linkedIds.length ? 'Nouveaux' : initialFilter),
    [openId, setOpenId] = useState(null),
    [reveal, setReveal] = useState(null), // match à rendre visible dans l'arbre paginé
    [view, setView] = useState(() => {
      try {
        const savedView = localStorage.getItem('pronos:match-view');
        return ['Arena', 'Arbre', 'Liste'].includes(savedView) ? savedView : 'Arena';
      } catch {
        return 'Arena';
      }
    });
  const localDraft = useLocalDraft(draftKey(userId, competitionId, 'matches'));
  const saveDrafts = (update) =>
    setDrafts((old) => {
      const next = typeof update === 'function' ? update(old) : update;
      localDraft.persist(Object.keys(next).length ? next : null);
      return next;
    });
  const seenKey = `pronos:seen-matches:${userId}:${competitionId}`;
  const [seen, setSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(seenKey) || 'null');
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (ready && seen === null) {
      const ids = matches.map((m) => m.id);
      setSeen(ids);
      try {
        localStorage.setItem(seenKey, JSON.stringify(ids));
      } catch {
        /* Optional device preference. */
      }
    }
  }, [ready, seen, matches, seenKey]);
  const newMatches = matches.filter((m) => linkedNew.includes(m.id) || (seen !== null && !seen.includes(m.id)));
  const showNew = () => {
    setFilter('Nouveaux');
  };
  const markSeen = () => {
    setLinkedNew([]);
    const ids = matches.map((m) => m.id);
    setSeen(ids);
    try {
      localStorage.setItem(seenKey, JSON.stringify(ids));
    } catch {
      /* Optional device preference. */
    }
    setFilter('Tous');
  };
  useEffect(() => {
    if (!focusTarget) return;
    setFilter('Tous');
    setReveal({ id: focusTarget.id });
    const timer = setTimeout(() => {
      const el = document.getElementById(`match-${focusTarget.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [focusTarget]);
  const saving = useRef(false);
  // Navigation clavier : après Entrée (ou Maj seule) sur un pronostic complet, on
  // enregistre puis on passe au prochain match ouvert sans pronostic.
  const pendingAdvance = useRef(null);
  const shiftAlone = useRef(false);
  const valid = matches.filter(
    (m) => m.player1?.trim() && m.player2?.trim() && m.player1 !== 'En attente...' && m.player2 !== 'En attente...',
  );
  const mine = (m) => m.predictions?.find((p) => p.userId === userId);
  const dirty = Object.keys(drafts).length > 0;
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const leave = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  const values = (m) => ({
    score1: mine(m)?.predictedScore1 ?? '',
    score2: mine(m)?.predictedScore2 ?? '',
    ...drafts[m.id],
  });
  const message = (id, text, failed = false) => setMessages((old) => ({ ...old, [id]: { text, failed } }));
  const save = async (ids) => {
    if (saving.current) return [];
    saving.current = true;
    setBusy(true);
    const saved = [];
    try {
      const ready_ = [];
      for (const id of ids) {
        const m = valid.find((m) => m.id === Number(id));
        if (!m) continue;
        const v = values(m),
          invalid = validateScores(v, m.maxScore || 15);
        if (invalid) {
          message(id, invalid, true);
          continue;
        }
        if (!ready || isMatchClosed(m, Date.now())) {
          message(
            id,
            'Le match est clos ou sa disponibilité ne peut pas être vérifiée. Votre saisie est conservée.',
            true,
          );
          continue;
        }
        ready_.push([id, { predictedScore1: Number(v.score1), predictedScore2: Number(v.score2) }]);
      }
      // Envois en parallèle (le serveur contrôle chaque clôture), puis un seul rafraîchissement.
      const results = await Promise.allSettled(
        ready_.map(([id, body]) =>
          onPreviewSave ? onPreviewSave(id, body) : API.post(`/matches/${id}/predict`, body),
        ),
      );
      results.forEach((r, i) => {
        const id = ready_[i][0];
        if (r.status === 'fulfilled') saved.push(Number(id));
        else
          message(
            id,
            r.reason?.response?.data?.error || 'Enregistrement impossible. Votre saisie est conservée.',
            true,
          );
      });
      if (saved.length) {
        await onRefresh();
        saveDrafts((old) => {
          const next = { ...old };
          for (const id of saved) delete next[id];
          return next;
        });
        for (const id of saved) message(id, 'Pronostic enregistré.');
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
    return saved;
  };
  const advance = async (id) => {
    const saved = await save([id]);
    if (saved.includes(id)) pendingAdvance.current = id;
  };
  useEffect(() => {
    // Attend la fin de l'enregistrement (champs réactivés) avant de déplacer le focus.
    if (busy || pendingAdvance.current === null) return;
    const current = pendingAdvance.current;
    pendingAdvance.current = null;
    // Arbre paginé : l'ordre suit le tableau entier, même les tours qui ne sont pas affichés.
    const paged = view === 'Arbre' && buildTree(valid);
    const ordered = paged
      ? paged.rounds.flatMap((r) => r.slots.filter((s) => s.match).map((s) => s.match.id))
      : view === 'Arena'
        ? valid.map((m) => m.id)
        : [...document.querySelectorAll('input[id^="input-"][id$="-1"]')].map((el) => Number(el.id.split('-')[1]));
    const next = nextMatchId(ordered, current, (mid) => {
      const m = valid.find((x) => x.id === mid);
      return Boolean(m) && !isMatchClosed(m, Date.now()) && !mine(m);
    });
    const focusInput = () => {
      const input = next && document.getElementById(`input-${next}-1`);
      if (input && !input.disabled) {
        input.focus({ preventScroll: true });
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    };
    if (focusInput()) return;
    if (next && (view === 'Arbre' || view === 'Arena')) {
      setReveal({ id: next });
      setTimeout(() => focusInput() || document.activeElement?.blur(), 50);
    } else document.activeElement?.blur(); // plus rien à saisir : ferme le clavier sur mobile
  });
  // Saisie commune aux vues Liste et Arbre.
  const type = (m, side, raw) => {
    const value = String(raw).replace(/\D/g, '').slice(0, 2);
    saveDrafts((old) => ({ ...old, [m.id]: { ...values(m), [`score${side}`]: value } }));
  };
  // Entrée (ou Maj seule) sur un pronostic complet : enregistre puis passe au prochain match à saisir.
  const keyDown = (m, side, e) => {
    if (e.key === 'Shift') {
      shiftAlone.current = !e.repeat;
      return;
    }
    shiftAlone.current = false; // Maj+Tab, Maj+chiffre… : pas de navigation
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = values(m);
    if (v.score1 !== '' && v.score2 !== '') advance(m.id);
    else if (side === 1) document.getElementById(`input-${m.id}-2`)?.focus();
    else save([m.id]);
  };
  const keyUp = (m, e) => {
    if (e.key !== 'Shift' || !shiftAlone.current) return;
    shiftAlone.current = false;
    const v = values(m);
    if (v.score1 !== '' && v.score2 !== '') advance(m.id);
  };
  // Tab ou toucher ailleurs : un match quitté avec deux scores valides est enregistré.
  const leave = (m) => {
    if (!drafts[m.id] || !ready || isMatchClosed(m, now)) return;
    if (validateScores(values(m), m.maxScore || 15)) return;
    save([m.id]);
  };
  const remove = async (m) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      if (onPreviewRemove) await onPreviewRemove(m.id);
      else await API.delete(`/matches/${m.id}/predict`);
      await onRefresh();
      saveDrafts((old) => {
        const next = { ...old };
        delete next[m.id];
        return next;
      });
      message(m.id, 'Pronostic supprimé.');
    } catch (e) {
      message(m.id, e.response?.data?.error || 'Suppression impossible.', true);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const visible = (m) =>
    filter === 'Nos tireurs'
      ? club.isClubFencer(m.player1) || club.isClubFencer(m.player2) || follows?.matchNames.includes(m.player1) || follows?.matchNames.includes(m.player2)
      : filter === 'Nouveaux'
        ? newMatches.some((n) => n.id === m.id)
        : filter === 'À venir'
          ? isUpcoming(m)
          : filter === 'À compléter'
            ? !mine(m) && !isMatchClosed(m, now)
            : filter === 'Ferment bientôt'
              ? !isMatchClosed(m, now) && m.closesAt && Date.parse(m.closesAt) - now <= 3600000
              : filter === 'Résultats publiés'
                ? m.isFinished
                : true;
  const groups = groupMatches(valid),
    next = () => {
      const target = valid.find((m) => !mine(m) && !isMatchClosed(m, now));
      setFilter('À compléter');
      if (target) setReveal({ id: target.id });
      if (target) setTimeout(() => document.getElementById(`input-${target.id}-1`)?.focus(), 50);
    };
  const checked = [...new Set(valid.map((m) => m.sourceCheckedAt).filter(Boolean))];
  const tree = buildTree(valid);
  const card = (m) => {
    const p = mine(m),
      v = values(m),
      closed = isMatchClosed(m, now),
      status = !ready
        ? 'Vérification…'
        : m.isFinished
          ? 'Résultat publié'
          : closed
            ? 'Clos'
            : drafts[m.id]
              ? 'Non enregistré'
              : p
                ? 'Enregistré'
                : 'À compléter';
    return (
      <article
        id={view === 'Arbre' ? `match-detail-${m.id}` : `match-${m.id}`}
        tabIndex={-1}
        className={`match-card ${focusTarget?.id === m.id ? 'match-target' : ''}`}
        key={m.id}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) leave(m);
        }}
      >
        <div className="match-meta">
          <span>
            {m.sourceKey ? `Match ${m.sourceKey.split(':').pop()}` : `#${m.id}`} · {roundLabel(m.round)}
            {m.strip && <span className="match-strip"> · {stripLabel(m.strip)}</span>}
          </span>
          <span className={`status-pill ${p && !drafts[m.id] ? 'saved' : ''}`}>{status}</span>
        </div>
        {[m.player1, m.player2].map((name, i) => (
          <label className="opponent-row" key={i}>
            <strong>
              {
                <span className={`arena-avatar avatar-${i}`} aria-hidden="true">
                  {name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </span>
              }
              {(club.isClubFencer(name) || follows?.matchNames.includes(name)) && (
                <span
                  className="club-star"
                  title={
                    follows?.matchNames.includes(name)
                      ? 'Tireur suivi'
                      : `Tireur du club${club.name ? ` ${club.name}` : ''}`
                  }
                >
                  ★{' '}
                </span>
              )}
              {name}
              {m[`player${i + 1}Country`] && ` - ${m[`player${i + 1}Country`]}`}
            </strong>
            {view === 'Arena' && (
              <button
                type="button"
                className="score-step"
                aria-label={`Diminuer le score de ${name}`}
                disabled={closed || busy || !ready}
                onClick={() => type(m, i + 1, String(Math.max(0, Number(v[`score${i + 1}`] || 0) - 1)))}
              >
                −
              </button>
            )}
            <input
              id={`${view === 'Arbre' ? 'detail-' : ''}input-${m.id}-${i + 1}`}
              aria-label={`Score prévu de ${name}`}
              inputMode="numeric"
              type="text"
              pattern="[0-9]*"
              maxLength={2}
              autoComplete="off"
              placeholder="—"
              value={v[`score${i + 1}`]}
              disabled={closed || busy || !ready}
              onChange={(e) => type(m, i + 1, e.target.value)}
              enterKeyHint="next"
              onKeyDown={(e) => keyDown(m, i + 1, e)}
              onKeyUp={(e) => keyUp(m, e)}
            />
            {view === 'Arena' && (
              <button
                type="button"
                className="score-step"
                aria-label={`Augmenter le score de ${name}`}
                disabled={closed || busy || !ready}
                onClick={() => type(m, i + 1, String(Math.min(99, Number(v[`score${i + 1}`] || 0) + 1)))}
              >
                +
              </button>
            )}
          </label>
        ))}
        {m.pointsPending ? (
          <p role="status">
            <strong>Points en attente de validation</strong>
            {m.progressionConfirmedAt && m.winnerName ? ` · ${m.winnerName} qualifié(e)` : ''}. Le reste du tableau
            continue.
          </p>
        ) : m.isFinished ? (
          <div className="official-result">
            <p>
              {m.resultType === 'MEDICAL_WITHDRAWAL'
                ? `Retrait médical · Victoire ${m.winnerName}`
                : `Résultat : ${m.score1} – ${m.score2}`}
            </p>
            {p && (
              <strong>
                {matchTotal(p)} {matchTotal(p) === 1 ? 'point' : 'points'}
                {p.bonusPoints > 0 && <span className="outsider-bonus"> dont +{p.bonusPoints} outsider</span>}
              </strong>
            )}
          </div>
        ) : (
          <MatchTiming match={m} now={now} hideChecked={checked.length === 1} />
        )}
        <HeadToHead matchId={m.id} player1={m.player1} player2={m.player2} />
        {!onPreviewSave && <MatchSocial matchId={m.id} counts={m.social} isAdmin={isAdmin} />}
        {closed && <CrowdTrend match={m} />}
        {m.syncIssue && <p role="alert">{m.syncIssue}</p>}
        {!m.isFinished && (
          <div className="match-actions">
            <button disabled={closed || busy || !drafts[m.id] || !ready} onClick={() => save([m.id])}>
              {busy ? 'Enregistrement…' : view === 'Arena' ? 'Enregistrer et suivant →' : 'Enregistrer'}
            </button>
            {p && (
              <button className="button-link" disabled={closed || busy || !ready} onClick={() => remove(m)}>
                Supprimer
              </button>
            )}
            {drafts[m.id] && (
              <button
                className="button-link"
                disabled={busy}
                onClick={() =>
                  saveDrafts((old) => {
                    const next = { ...old };
                    delete next[m.id];
                    return next;
                  })
                }
              >
                Annuler la saisie
              </button>
            )}
          </div>
        )}
        {messages[m.id] && (
          <p
            role={messages[m.id].failed ? 'alert' : 'status'}
            className={messages[m.id].failed ? 'pool-error' : 'pool-saved'}
          >
            {messages[m.id].text}
          </p>
        )}
      </article>
    );
  };
  return (
    <section
      className={`match-board ${view === 'Arena' ? 'arena-board' : ''}`}
      aria-label="Tableau d’élimination directe"
    >
      <>
        {newMatches.length > 0 && (
          <aside className="new-matches">
            <strong>
              {withCount(newMatches.length, 'nouvelle rencontre', 'nouvelles rencontres')} dans cette épreuve
            </strong>{' '}
            <button onClick={showNew}>Voir les nouvelles rencontres</button>{' '}
            <button className="button-link" onClick={markSeen}>
              Marquer comme vues
            </button>
          </aside>
        )}
      </>
      {ready && (
        <DraftNotice
          draft={localDraft}
          onRestore={(value) =>
            saveDrafts(
              Object.fromEntries(
                Object.entries(value).filter(([id]) =>
                  valid.some((m) => String(m.id) === id && !isMatchClosed(m, now)),
                ),
              ),
            )
          }
        />
      )}
      {!ready && <p role="status">Vérification des matchs…</p>}
      {stale && (
        <p className="stale-banner" role="status">
          Connexion instable : les matchs affichés ne sont peut-être pas à jour. Vos saisies restent possibles.{' '}
          <button className="button-link" onClick={onRefresh}>
            Actualiser
          </button>
        </p>
      )}
      {ready && (
        <>
          <p className="board-summary">
            <strong>
              {valid.filter((m) => mine(m)).length}/{valid.length}
            </strong>{' '}
            enregistrés · <strong>{valid.filter((m) => !mine(m) && !isMatchClosed(m, now)).length}</strong> à compléter
          </p>
          <div className="board-toolbar">
            <div className="filter-row filter-scroll" role="group" aria-label="Filtrer les matchs">
              {[
                'Tous',
                ...(club.hasFencers || follows?.matchNames.length ? ['Nos tireurs'] : []),
                'À compléter',
                'À venir',
                'Ferment bientôt',
                'Résultats publiés',
              ].map((x) => (
                <button key={x} aria-pressed={filter === x} onClick={() => setFilter(x)}>
                  {x === 'Arena' ? 'Cartes' : x === 'Arbre' ? 'Tableau complet' : x}
                </button>
              ))}
            </div>
            <div className="filter-row view-toggle" role="group" aria-label="Affichage">
              {['Arena', 'Liste', 'Arbre'].map((x) => (
                <button
                  key={x}
                  aria-pressed={view === x}
                  onClick={() => {
                    setView(x);
                    try {
                      localStorage.setItem('pronos:match-view', x);
                    } catch {
                      /* Optional preference. */
                    }
                  }}
                >
                  {x === 'Arena' ? 'Cartes' : x === 'Arbre' ? 'Tableau complet' : x}
                </button>
              ))}
            </div>
          </div>
          <div className="feature-heading board-next">
            {checked.length === 1 && (
              <p className="muted">Dernière vérification officielle : {new Date(checked[0]).toLocaleString('fr-FR')}</p>
            )}
            <button
              className="button-link"
              onClick={next}
              disabled={!valid.some((m) => !mine(m) && !isMatchClosed(m, now))}
            >
              Pronostic suivant →
            </button>
          </div>
          {view === 'Arena' ? (
            <div className="arena-dashboard">
              <section className="arena-featured">
                <p className="arena-eyebrow">LE PROCHAIN ASSAUT</p>
                <h2>Qui passe au tour suivant ?</h2>
                <p>
                  {valid.filter((m) => mine(m)).length} / {valid.length} pronostics enregistrés
                </p>
                {(() => {
                  const candidates = valid.filter(visible);
                  const featured =
                    candidates.find((m) => m.id === reveal?.id) ||
                    candidates.find((m) => !mine(m) && !isMatchClosed(m, now)) ||
                    candidates[0];
                  return featured ? card(featured) : <p>Aucun match pour ce filtre.</p>;
                })()}
              </section>
              <aside className="piste-card-guide">
                <p className="arena-eyebrow">VOTRE PARCOURS</p>
                <h2>Un assaut à la fois.</h2>
                <p>Choisissez votre score puis enregistrez. Le prochain match sans pronostic vous sera proposé.</p>
                <p>Retrouvez toutes les affiches dans « Tableau complet ».</p>
              </aside>
              <section className="arena-other-matches">
                <h2>Toutes les rencontres</h2>
                <div className="match-grid">
                  {valid.filter(visible).map((m) => (
                    <button
                      className="button-secondary"
                      key={m.id}
                      onClick={() => {
                        setView('Liste');
                        setReveal({ id: m.id });
                      }}
                    >
                      {roundLabel(m.round)} · {m.player1} / {m.player2}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : view === 'Arbre' && tree ? (
            <div className="piste-bracket-layout">
              <p className="muted">
                Votre score pronostiqué en face des tireurs, le résultat officiel en bas à droite. Entrée enregistre et
                passe au match suivant ; touchez un match pour son détail.
              </p>
              <BracketTree
                tree={tree}
                ready={ready}
                busy={busy}
                drafts={drafts}
                values={values}
                mine={mine}
                isClosed={(m) => isMatchClosed(m, now)}
                visible={visible}
                club={club}
                onType={type}
                onKey={keyDown}
                onKeyUp={keyUp}
                onLeave={leave}
                onOpen={(m) => setOpenId((old) => (old === m.id ? null : m.id))}
                openId={openId}
                revealId={reveal}
                renderDetail={card}
                onCloseDetail={() => setOpenId(null)}
              />
              {tree.bronze && (
                <section className="round-column tree-bronze">
                  <h2>{roundLabel('Bronze')}</h2>
                  <div className="match-grid">{card(tree.bronze)}</div>
                </section>
              )}

            </div>
          ) : (
            <div className="rounds">
              {groups
                .filter((g) => g.items.some(visible))
                .map(({ round, items }) => (
                  <section className="round-column" key={round}>
                    <h2>
                      {roundLabel(round)}{' '}
                      <span className="round-count">
                        {items.filter((m) => mine(m)).length}/{items.length}
                      </span>
                    </h2>
                    <div className="match-grid">{items.filter(visible).map(card)}</div>
                  </section>
                ))}
            </div>
          )}
          {!valid.some(visible) && (
            <p className="pool-empty">
              {valid.length
                ? 'Aucune rencontre ne correspond à ce filtre.'
                : 'Les rencontres apparaîtront après publication et import du tableau officiel.'}
            </p>
          )}
        </>
      )}
      {dirty && (
        <div className="save-dock">
          <span>{withCount(Object.keys(drafts).length, 'saisie non enregistrée', 'saisies non enregistrées')}</span>
          <button disabled={busy || !ready} onClick={() => save(Object.keys(drafts))}>
            {busy ? 'Enregistrement…' : 'Tout enregistrer'}
          </button>
        </div>
      )}
    </section>
  );
}
