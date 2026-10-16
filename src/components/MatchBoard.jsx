import { withLiveDetection } from '../lib/liveScoreState';
import { createPortal } from 'react-dom';
import MatchExtras from './MatchExtras';
import { restoreBody, canUndoPrediction, UX_SAVE } from '../lib/uxFeatures';
import BoostBadge from './BoostBadge';
import { useFencerFollows, isFollowedFencer } from '../lib/fencerFollows';
import CrowdTrend from './CrowdTrend';
import { matchTotal } from './resultPresentation';
import { roundLabel, stripLabel } from './matchPresentation';
import { useEffect, useRef, useState } from 'react';
import API from '../api';
import useLocalDraft, { draftKey } from './useLocalDraft';
import DraftNotice from './DraftNotice';
import { withCount } from '../lib/plural';
import MatchTiming from './MatchTiming';
import { groupMatches, isMatchClosed, validateScores, nextMatchId } from './matchPresentation';
import { useNow } from '../lib/polling';
import { reducedData } from '../lib/fieldCache';
import {
  CLOSED_REFUSAL_MESSAGE,
  OUTBOX_EVENT,
  dropWrite,
  isClosedRefusal,
  isNetworkError,
  queueWrite,
} from '../lib/outbox';
import HeadToHead from './HeadToHead';
import LiveScore from './LiveScore';
import TouchStrip from './TouchStrip';
import './express.css';
import { useLiveScores } from '../lib/useLiveScores';
import MatchSocial from './MatchSocial';
import BracketTree from './BracketTree.jsx';
import { buildTree } from './bracketTree';
import { defaultTableauPhase, tableauPhase } from './tableauPhase';

// Barre collée au-dessus du clavier du téléphone (suit la zone visible quand le clavier s'ouvre).
function KeyboardBar({ children }) {
  const [top, setTop] = useState(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const place = () => setTop(vv.offsetTop + vv.height);
    place();
    vv.addEventListener('resize', place);
    vv.addEventListener('scroll', place);
    return () => {
      vv.removeEventListener('resize', place);
      vv.removeEventListener('scroll', place);
    };
  }, []);
  return (
    <div
      className="keyboard-bar"
      role="toolbar"
      aria-label="Saisie du pronostic"
      style={top === null ? { bottom: 0 } : { top }}
    >
      {children}
    </div>
  );
}

const VIEW_LABELS = { Express: 'Express', Arena: 'Cartes', Liste: 'Liste', Arbre: 'Tableau complet' };
// Pictogrammes des trois affichages (le libellé reste lisible sur grand écran et pour les lecteurs d'écran).
function ViewIcon({ view }) {
  const common = {
    viewBox: '0 0 20 20',
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    'aria-hidden': true,
  };
  if (view === 'Arena')
    return (
      <svg {...common}>
        <rect x="3" y="3" width="14" height="14" rx="2.5" />
        <path d="M3 10h14" />
      </svg>
    );
  if (view === 'Express')
    return (
      <svg {...common}>
        <path d="M11 2 4 11h5l-1 7 7-9h-5l1-7Z" strokeLinejoin="round" />
      </svg>
    );
  if (view === 'Liste')
    return (
      <svg {...common}>
        <path d="M4 5h12M4 10h12M4 15h12" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M3 4h4v4H3zM3 12h4v4H3zM7 6h3v8H7M10 10h3M13 8h4v4h-4z" />
    </svg>
  );
}

export default function MatchBoard({
  initialFilter = 'Tous',
  matches,
  byes = null,
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
  onOpenLive = null,
  onPreviewRemove,
}) {
  const [undoSave, setUndoSave] = useState(null),
    [undoMessage, setUndoMessage] = useState('');
  const undoTimer = useRef(null);
  useEffect(() => () => clearTimeout(undoTimer.current), []);
  const clock = useNow(5000);
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
    [filter, setFilterState] = useState(
      linkedIds.length || initialFilter === 'Nouveaux'
        ? 'À compléter'
        : initialFilter === 'À venir'
          ? 'En cours'
          : initialFilter,
    ),
    // Matchs enregistrés depuis le choix du filtre : restent affichés (pas de saut d'écran avec « À compléter »).
    [kept, setKept] = useState(() => new Set()),
    [openId, setOpenId] = useState(null),
    [reveal, setReveal] = useState(null), // match à rendre visible dans l'arbre paginé
    [view, setView] = useState(() => {
      try {
        const savedView = localStorage.getItem('pronos:match-view');
        // Connexion faible : la liste, l'affichage le plus léger, sauf choix de la liste déjà fait.
        if (reducedData()) return 'Liste';
        return ['Arena', 'Arbre', 'Liste', 'Express'].includes(savedView) ? savedView : 'Arena';
      } catch {
        return 'Arena';
      }
    });
  const setFilter = (value) => {
    setKept(new Set());
    setFilterState(value);
  };
  // Pronostic envoyé plus tard (retour du réseau) : brouillon effacé et tableau relu, ou refus affiché.
  const outboxRef = useRef(null);
  useEffect(() => {
    const done = (event) => {
      const id = Number(/^match:(\d+)$/.exec(event.detail?.key || '')?.[1]);
      if (!id || !('ok' in (event.detail || {}))) return;
      outboxRef.current?.(id, event.detail);
    };
    window.addEventListener(OUTBOX_EVENT, done);
    return () => window.removeEventListener(OUTBOX_EVENT, done);
  }, []);
  const localDraft = useLocalDraft(draftKey(userId, competitionId, 'matches'));
  // Scores en direct des pistes, tant qu'il reste des rencontres non terminées (affichage seulement).
  const live = useLiveScores(competitionId, !onPreviewSave && matches.some((m) => !m.isFinished));
  const withLiveLock = (match) => withLiveDetection(match, live);
  const closedMatch = (match, at) => isMatchClosed(withLiveLock(match), at);
  const requestedPhase = new URLSearchParams(location.search).get('phase');
  const allValid = matches.filter(
    (m) => m.player1?.trim() && m.player2?.trim() && m.player1 !== 'En attente...' && m.player2 !== 'En attente...',
  );
  const multiphase = matches.some((m) => m.round?.startsWith('J1:'));
  // Choix initial seulement : un chrono qui démarre ne fait pas changer de journée pendant la saisie.
  const [selectedPhase, setSelectedPhase] = useState(() => {
    if (['main', 'preliminary'].includes(requestedPhase)) return requestedPhase;
    const target = matches.find((m) => m.id === focusTarget?.id || linkedIds.includes(m.id));
    return target ? tableauPhase(target) : defaultTableauPhase(allValid, (m) => closedMatch(m, now));
  });
  const choosePhase = (phase) => {
    setSelectedPhase(phase);
    setFilter('Tous');
    setOpenId(null);
    const url = new URL(location.href);
    url.searchParams.set('phase', phase);
    history.replaceState(history.state, '', url);
  };
  const valid = allValid.filter((m) => !multiphase || tableauPhase(m) === selectedPhase);
  // Copie synchrone des saisies : l'enregistrement en arrière-plan et le passage au match suivant
  // lisent toujours la dernière frappe, même avant le prochain rendu.
  const draftsRef = useRef({});
  const saveDrafts = (update) => {
    const next = typeof update === 'function' ? update(draftsRef.current) : update;
    draftsRef.current = next;
    localDraft.persist(Object.keys(next).length ? next : null);
    setDrafts(next);
  };
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
  // Nouvelles rencontres = apparues depuis la dernière visite ET encore à pronostiquer : une rencontre déjà
  // pronostiquée, terminée ou close ne compte plus (le bouton mène toujours à un pronostic à faire).
  const newMatches = matches.filter(
    (m) =>
      (linkedNew.includes(m.id) || (seen !== null && !seen.includes(m.id))) &&
      !m.predictions?.some((p) => p.userId === userId) &&
      !closedMatch(m, now),
  );
  // Le filtre commun inclut les nouvelles rencontres ; conserve le défilement et la surbrillance.
  const [flashId, setFlashId] = useState(null);
  const showNew = () => {
    const ids = new Set(newMatches.map((m) => m.id));
    if (newMatches[0]) setSelectedPhase(tableauPhase(newMatches[0]));
    setFilter('À compléter');
    if (!ids.size) return;
    // Première nouvelle rencontre dans l'ordre affiché (après application du filtre).
    setTimeout(() => {
      const el = [...document.querySelectorAll('.match-card')].find((e) => ids.has(Number(/(\d+)$/.exec(e.id)?.[1])));
      const id = Number(/(\d+)$/.exec(el?.id || '')?.[1]) || [...ids][0];
      setReveal({ id });
      setFlashId(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
      setTimeout(() => setFlashId((current) => (current === id ? null : current)), 2600);
    }, 60);
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
  const focusedPhase = matches.find((m) => m.id === focusTarget?.id);
  const focusedPhaseName = focusedPhase ? tableauPhase(focusedPhase) : null;
  useEffect(() => {
    if (!focusTarget) return;
    setFilter('Tous');
    if (focusedPhaseName) setSelectedPhase(focusedPhaseName);
    setReveal({ id: focusTarget.id });
    const timer = setTimeout(() => {
      const el = document.getElementById(`match-${focusTarget.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [focusTarget, focusedPhaseName]);
  const saving = useRef(false);
  // Enregistrements demandés pendant un envoi : traités juste après (aucune saisie perdue).
  const queued = useRef(new Set());
  const saveRef = useRef(null);
  const shiftAlone = useRef(false);
  const mine = (m) => m.predictions?.find((p) => p.userId === userId);
  // Saisies en attente d'envoi (sans réseau) : déjà prises en charge, elles ne bloquent pas la navigation.
  const [queuedIds, setQueuedIds] = useState(() => new Set());
  const [saveTarget, setSaveTarget] = useState(null);
  useEffect(() => {
    setSaveTarget(document.getElementById('pool-save-action'));
  }, []);
  const dirty = Object.keys(drafts).some((id) => !queuedIds.has(Number(id)));
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
  // winner : vainqueur désigné sans score (pronostic simplifié) ; un score complet l'emporte sur lui.
  // d : saisies du rendu (affichage) ou draftsRef.current (gestionnaires d'événements, dernière frappe).
  // Vainqueurs choisis pendant la session : l'affichage ne dépend pas de la forme de la réponse
  // (simulation locale, ancienne version du serveur…).
  const [picks, setPicks] = useState({});
  const values = (m, d = drafts) => {
    const p = mine(m);
    const scoreless = p && !Number.isInteger(p.predictedScore1) && !Number.isInteger(p.predictedScore2);
    const side = p?.winnerOnly
      ? p.predictedScore1 > p.predictedScore2
        ? 1
        : 2
      : scoreless
        ? [1, 2].includes(p.winner)
          ? p.winner
          : picks[m.id] || null
        : null;
    const base = side
      ? { score1: side === 1 ? m.maxScore || 15 : '', score2: side === 2 ? m.maxScore || 15 : '', winner: side }
      : { score1: p?.predictedScore1 ?? '', score2: p?.predictedScore2 ?? '', winner: null };
    return { ...base, ...d[m.id] };
  };
  const pickedSide = (m, v = values(m)) =>
    !validateScores(v, m.maxScore || 15) ? (Number(v.score1) > Number(v.score2) ? 1 : 2) : v.winner || null;
  const message = (id, text, failed = false) => setMessages((old) => ({ ...old, [id]: { text, failed } }));
  // Clôture passée : la saisie ne passera plus, on l'efface et on relit le tableau au serveur
  // (pas la copie de l'appareil) pour que la carte s'affiche close.
  const refusedClosed = (ids) => {
    for (const id of ids) {
      dropWrite(`match:${id}`);
      message(id, CLOSED_REFUSAL_MESSAGE, true);
    }
    saveDrafts((old) => {
      const next = { ...old };
      for (const id of ids) delete next[id];
      return next;
    });
    setKept((old) => new Set([...old, ...ids.map(Number)]));
    onRefresh?.({ force: true });
  };
  useEffect(() => {
    outboxRef.current = (id, detail) => {
      setQueuedIds((old) => {
        const next = new Set(old);
        next.delete(id);
        return next;
      });
      if (detail.ok) {
        saveDrafts((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        message(id, 'Pronostic envoyé.');
        setKept((old) => new Set([...old, id]));
        onRefresh?.();
      } else if (isClosedRefusal(detail.status)) refusedClosed([id]);
      else message(id, `${detail.error} Votre saisie est conservée.`, true);
    };
  });
  const save = async (ids) => {
    if (saving.current) {
      for (const id of ids) queued.current.add(Number(id));
      return [];
    }
    saving.current = true;
    setBusy(true);
    const saved = [],
      refused = [];
    try {
      const ready_ = [];
      for (const id of ids) {
        const m = allValid.find((m) => m.id === Number(id));
        if (!m) continue;
        const v = values(m, draftsRef.current),
          winnerOnly = [1, 2].includes(v.winner) && v[`score${v.winner === 1 ? 2 : 1}`] === '',
          invalid = winnerOnly ? null : validateScores(v, m.maxScore || 15);
        if (invalid) {
          message(id, `${invalid} Ou touchez simplement le nom du vainqueur.`, true);
          continue;
        }
        if (!ready || closedMatch(m, Date.now())) {
          message(
            id,
            'Le match est clos ou sa disponibilité ne peut pas être vérifiée. Votre saisie est conservée.',
            true,
          );
          continue;
        }
        if (winnerOnly) setPicks((old) => ({ ...old, [m.id]: v.winner }));
        ready_.push([
          id,
          winnerOnly ? { winner: v.winner } : { predictedScore1: Number(v.score1), predictedScore2: Number(v.score2) },
          mine(m) ? { ...mine(m) } : null,
        ]);
      }
      // Envois en parallèle (le serveur contrôle chaque clôture), puis un seul rafraîchissement.
      const undoRecords = [];
      const results = await Promise.allSettled(
        ready_.map(([id, body]) =>
          onPreviewSave ? onPreviewSave(id, body) : API.post(`/matches/${id}/predict`, body),
        ),
      );
      results.forEach((r, i) => {
        const [id, body] = ready_[i];
        if (r.status === 'fulfilled') {
          saved.push(Number(id));
          undoRecords.push({ id: Number(id), previous: ready_[i][2], saved: r.value?.data || null });
          dropWrite(`match:${id}`);
        } else if (!onPreviewSave && isNetworkError(r.reason)) {
          // Pas de réseau : gardé sur l'appareil et envoyé tout seul dès que la connexion revient.
          queueWrite({ key: `match:${id}`, method: 'post', url: `/matches/${id}/predict`, data: body });
          setQueuedIds((old) => new Set([...old, Number(id)]));
          message(id, 'Pas de réseau : pronostic gardé et envoyé automatiquement dès que la connexion revient.');
        } else if (!onPreviewSave && isClosedRefusal(r.reason?.response?.status)) refused.push(Number(id));
        else
          message(
            id,
            r.reason?.response?.data?.error || 'Enregistrement impossible. Votre saisie est conservée.',
            true,
          );
      });
      if (refused.length) refusedClosed(refused);
      if (saved.length) {
        await onRefresh();
        saveDrafts((old) => {
          const next = { ...old };
          for (const id of saved) delete next[id];
          return next;
        });
        for (const id of saved) message(id, 'Pronostic enregistré.');
        clearTimeout(undoTimer.current);
        setUndoMessage('');
        setUndoSave({ records: undoRecords, until: Date.now() + 5000 });
        undoTimer.current = setTimeout(() => setUndoSave(null), 5000);
        if (!onPreviewSave) window.dispatchEvent(new Event(UX_SAVE));
        setKept((old) => new Set([...old, ...saved]));
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
    // Saisies terminées pendant l'envoi : enregistrées à la suite, avec la version la plus récente du code.
    const later = [...queued.current].filter((id) => draftsRef.current[id]);
    queued.current.clear();
    if (later.length) setTimeout(() => saveRef.current(later), 0);
    return saved;
  };
  useEffect(() => {
    saveRef.current = save;
  });
  // Prochain match ouvert sans pronostic, dans l'ordre affiché.
  const nextOpen = (current) => {
    // Arbre paginé : l'ordre suit le tableau entier, même les tours qui ne sont pas affichés.
    const paged = view === 'Arbre' && buildTree(valid, byes);
    const ordered = paged
      ? paged.rounds.flatMap((r) => r.slots.filter((s) => s.match).map((s) => s.match.id))
      : view === 'Arena'
        ? valid.map((m) => m.id)
        : [...document.querySelectorAll('input[id^="input-"][id$="-1"]')].map((el) => Number(el.id.split('-')[1]));
    return nextMatchId(ordered, current, (mid) => {
      const m = valid.find((x) => x.id === mid);
      return Boolean(m) && !closedMatch(m, Date.now()) && !mine(m) && !draftsRef.current[mid];
    });
  };
  // Passe au match suivant. Le focus est déplacé tout de suite (dans le geste de l'utilisateur) :
  // le clavier du téléphone reste affiché, l'enregistrement se fait en arrière-plan.
  const goTo = (next, withKeyboard) => {
    if (!next) {
      if (withKeyboard) document.activeElement?.blur(); // plus rien à saisir : ferme le clavier
      return;
    }
    setReveal({ id: next });
    const show = () => {
      const input = document.getElementById(`input-${next}-1`);
      const target = withKeyboard ? input : document.getElementById(`match-${next}`) || input;
      if (!target) return false;
      if (withKeyboard && !input.disabled) input.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'smooth', block: withKeyboard ? 'center' : 'nearest' });
      return true;
    };
    if (!show()) setTimeout(show, 60);
  };
  const commit = (m) => {
    const next = nextOpen(m.id);
    save([m.id]);
    goTo(next, true);
  };
  // Saisie complète : « 0 », deux chiffres, ou un chiffre qui ne peut plus être suivi d'un autre (3 sur 15).
  const complete = (value, max) => value === '0' || value.length >= 2 || Number(value) * 10 > max;
  // Saisie commune aux vues Liste et Arbre. Score complet : on passe seul au champ ou au match suivant.
  const type = (m, side, raw, el = null) => {
    const value = String(raw).replace(/\D/g, '').slice(0, 2);
    const v = { ...values(m, draftsRef.current), [`score${side}`]: value, winner: null };
    saveDrafts((old) => ({ ...old, [m.id]: v }));
    if (!el || !value || !complete(value, m.maxScore || 15)) return;
    const prefix = el.id.startsWith('detail-') ? 'detail-' : '';
    if (side === 1 && v.score2 === '') document.getElementById(`${prefix}input-${m.id}-2`)?.focus();
    else if (!validateScores(v, m.maxScore || 15)) commit(m);
  };
  // Pronostic simplifié : toucher le nom du vainqueur suffit (score facultatif).
  const pick = (m, side) => {
    if (!ready || closedMatch(m, now)) return;
    if (pickedSide(m, values(m, draftsRef.current)) === side && !draftsRef.current[m.id]) return;
    saveDrafts((old) => ({
      ...old,
      [m.id]: { score1: side === 1 ? m.maxScore || 15 : '', score2: side === 2 ? m.maxScore || 15 : '', winner: side },
    }));
    save([m.id]);
    // Le joueur reste sur ce match : il peut ajouter le score (clavier ouvert), puis choisir
    // « Match suivant » dans la barre au-dessus du clavier.
    setReveal({ id: m.id });
    const prefix = view === 'Arbre' ? 'detail-' : '';
    document.getElementById(`${prefix}input-${m.id}-${side === 1 ? 2 : 1}`)?.focus({ preventScroll: true });
  };
  // Mode express : un toucher = vainqueur enregistré, sans ouvrir le score ni changer de match.
  // Un pronostic déjà complet (score exact) n'est remplacé que si l'on choisit l'autre tireur.
  const expressPick = (m, side) => {
    if (!ready || closedMatch(m, now)) return;
    if (pickedSide(m, values(m, draftsRef.current)) === side && !draftsRef.current[m.id]) return;
    saveDrafts((old) => ({
      ...old,
      [m.id]: { score1: side === 1 ? m.maxScore || 15 : '', score2: side === 2 ? m.maxScore || 15 : '', winner: side },
    }));
    save([m.id]);
  };
  // Barre au-dessus du clavier (mobile) : match en cours de saisie.
  const [typingId, setTypingId] = useState(null);
  const touchDevice = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const scoreInputId = (el) => Number(/(?:^|-)input-(\d+)-[12]$/.exec(el?.id || '')?.[1]) || null;
  const onFocusIn = (e) => {
    const id = scoreInputId(e.target);
    if (id && touchDevice()) setTypingId(id);
  };
  const onFocusOut = (e) => {
    if (!scoreInputId(e.relatedTarget)) setTypingId(null);
  };
  // « Match suivant » : score complet → enregistré, clavier gardé pour le match suivant ;
  // vainqueur seul → on ferme le clavier et on montre le match suivant (toucher son vainqueur).
  const nextFromBar = () => {
    const m = valid.find((x) => x.id === typingId);
    if (!m) return;
    const v = values(m, draftsRef.current);
    const scored = v.score1 !== '' || v.score2 !== '';
    if (scored && validateScores(v, m.maxScore || 15)) {
      if (!mine(m)) return message(m.id, 'Score incomplet : complétez-le ou touchez le nom du vainqueur.', true);
      saveDrafts((old) => {
        const next = { ...old };
        delete next[m.id];
        return next;
      });
    } else if (draftsRef.current[m.id]) save([m.id]);
    const next = nextOpen(m.id);
    if (scored && !validateScores(v, m.maxScore || 15)) return goTo(next, true);
    document.activeElement?.blur();
    setTypingId(null);
    goTo(next, false);
  };
  const typingMatch = typingId && valid.find((x) => x.id === typingId);
  const typingStatus = typingMatch
    ? drafts[typingMatch.id]
      ? busy
        ? 'Enregistrement…'
        : 'Saisie en cours'
      : mine(typingMatch)
        ? mine(typingMatch).winnerOnly
          ? '✓ Vainqueur enregistré'
          : '✓ Enregistré'
        : 'À compléter'
    : '';
  // Entrée (ou Maj seule) sur un pronostic complet : enregistre puis passe au prochain match à saisir.
  const keyDown = (m, side, e) => {
    if (e.key === 'Shift') {
      shiftAlone.current = !e.repeat;
      return;
    }
    shiftAlone.current = false; // Maj+Tab, Maj+chiffre… : pas de navigation
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const v = values(m, draftsRef.current);
    const prefix = e.currentTarget.id.startsWith('detail-') ? 'detail-' : '';
    if (v.score1 !== '' && v.score2 !== '') commit(m);
    else if (side === 1) document.getElementById(`${prefix}input-${m.id}-2`)?.focus();
    else save([m.id]);
  };
  const keyUp = (m, e) => {
    if (e.key !== 'Shift' || !shiftAlone.current) return;
    shiftAlone.current = false;
    const v = values(m, draftsRef.current);
    if (v.score1 !== '' && v.score2 !== '') commit(m);
  };
  // Tab ou toucher ailleurs : un match quitté avec deux scores valides est enregistré.
  const leave = (m) => {
    if (!draftsRef.current[m.id] || !ready || closedMatch(m, now)) return;
    if (validateScores(values(m, draftsRef.current), m.maxScore || 15)) return;
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
    filter === 'Mes tireurs'
      ? isFollowedFencer(follows, m.player1) || isFollowedFencer(follows, m.player2)
      : filter === 'En cours'
        ? !!live.get(m.id) && !live.get(m.id).finished && !m.isFinished
        : filter === 'À compléter'
          ? (!mine(m) && !closedMatch(m, now)) || kept.has(m.id)
          : filter === 'Ferment bientôt'
            ? !closedMatch(m, now) && m.closesAt && Date.parse(m.closesAt) - now <= 3600000
            : filter === 'Résultats publiés'
              ? m.isFinished
              : true;
  const groups = groupMatches(valid),
    next = () => {
      const target = valid.find((m) => !mine(m) && !closedMatch(m, now));
      setFilter('À compléter');
      if (target) setReveal({ id: target.id });
      if (target) setTimeout(() => document.getElementById(`input-${target.id}-1`)?.focus(), 50);
    };
  const checked = [...new Set(valid.map((m) => m.sourceCheckedAt).filter(Boolean))];
  const tree = buildTree(valid, byes);
  const undoLastSave = async () => {
    if (!undoSave || busy || Date.now() >= undoSave.until) return;
    const records = undoSave.records;
    clearTimeout(undoTimer.current);
    setUndoSave(null);
    setBusy(true);
    try {
      const current = onPreviewSave
        ? null
        : (await API.get('/matches', { params: { competitionId }, forceRefresh: true })).data;
      for (const record of records) {
        const match = current?.find((m) => m.id === record.id);
        if (!onPreviewSave && !canUndoPrediction(match, record.saved, userId, Date.now())) {
          throw new Error('Annulation impossible : le match est clos ou le pronostic a changé.');
        }
        const body = restoreBody(record.previous);
        if (body) {
          if (onPreviewSave) await onPreviewSave(record.id, body);
          else await API.post(`/matches/${record.id}/predict`, body);
        } else if (onPreviewRemove) await onPreviewRemove(record.id);
        else await API.delete(`/matches/${record.id}/predict`);
      }
      setUndoMessage('Dernier enregistrement annulé.');
      setPicks((old) => {
        const next = { ...old };
        records.forEach((r) => delete next[r.id]);
        return next;
      });
      saveDrafts((old) => {
        const next = { ...old };
        records.forEach((r) => delete next[r.id]);
        return next;
      });
    } catch (error) {
      setUndoMessage(error.response?.data?.error || error.message || 'Annulation non confirmée.');
    } finally {
      await onRefresh();
      setBusy(false);
    }
  };
  const card = (m) => {
    const p = mine(m),
      v = values(m),
      closed = closedMatch(m, now),
      status = !ready
        ? 'Vérification…'
        : m.isFinished
          ? 'Résultat publié'
          : closed
            ? 'Clos'
            : drafts[m.id]
              ? 'Non enregistré'
              : p
                ? p.winnerOnly || (pickedSide(m, v) && v.score1 === '' && v.score2 === '')
                  ? 'Vainqueur choisi'
                  : 'Enregistré'
                : 'À compléter';
    const picked = pickedSide(m, v);
    return (
      <article
        id={view === 'Arbre' ? `match-detail-${m.id}` : `match-${m.id}`}
        tabIndex={-1}
        className={`match-card ${focusTarget?.id === m.id || flashId === m.id ? 'match-target' : ''}`}
        key={m.id}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) leave(m);
        }}
      >
        <div className="match-meta">
          <span>
            {m.sourceKey ? `Match ${m.sourceKey.split(':').pop()}` : `#${m.id}`} · {roundLabel(m.round, multiphase)}
            {m.strip && <span className="match-strip"> · {stripLabel(m.strip)}</span>}{' '}
            <BoostBadge multiplier={m.pointsMultiplier} compact />
          </span>
          <span className={`status-pill ${p && !drafts[m.id] ? 'saved' : ''}`}>{status}</span>
        </div>
        <LiveScore live={live.get(m.id)} onOpen={onOpenLive} />
        <TouchStrip
          history={live.get(m.id)?.history}
          issue={live.get(m.id)?.historyIssue}
          player1={m.player1}
          player2={m.player2}
          live={Boolean(live.get(m.id) && !live.get(m.id).finished)}
          compact
        />
        {[m.player1, m.player2].map((name, i) => (
          <label className={`opponent-row${picked === i + 1 ? ' is-picked' : ''}`} key={i}>
            {/* Structure d'origine conservée (mise en page des cartes) : le nom sert de bouton « vainqueur ». */}
            <strong
              className={closed || !ready ? undefined : 'winner-pick'}
              role={closed || !ready ? undefined : 'button'}
              tabIndex={closed || !ready ? undefined : 0}
              aria-pressed={closed || !ready ? undefined : picked === i + 1}
              title={closed || !ready ? undefined : `${name} vainqueur`}
              onClick={(e) => {
                if (closed || !ready) return;
                e.preventDefault(); // pas de transfert du clic vers le champ de score
                pick(m, i + 1);
              }}
              onKeyDown={(e) => {
                if (closed || !ready || (e.key !== 'Enter' && e.key !== ' ')) return;
                e.preventDefault();
                pick(m, i + 1);
              }}
            >
              {
                <span className={`arena-avatar avatar-${i}`} aria-hidden="true">
                  {name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </span>
              }
              {isFollowedFencer(follows, name) && (
                <span className="club-star" title="Tireur suivi">
                  ★{' '}
                </span>
              )}
              <span className="match-player-name">
                {m[`seed${i + 1}`] != null && (
                  <span
                    className="match-seed"
                    title="Place dans le tableau"
                    aria-label={`Place ${m[`seed${i + 1}`]} dans le tableau`}
                  >
                    {m[`seed${i + 1}`]}
                  </span>
                )}
                {name}
                {m[`player${i + 1}Country`] && ` - ${m[`player${i + 1}Country`]}`}
              </span>
              {picked === i + 1 && (
                <span className="winner-tag" title="Vainqueur choisi" aria-hidden="true">
                  ✓
                </span>
              )}
            </strong>
            {view === 'Arena' && (
              <button
                type="button"
                className="score-step"
                aria-label={`Diminuer le score de ${name}`}
                disabled={closed || !ready}
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
              disabled={closed || !ready}
              onChange={(e) => type(m, i + 1, e.target.value, e.target)}
              enterKeyHint="next"
              onKeyDown={(e) => keyDown(m, i + 1, e)}
              onKeyUp={(e) => keyUp(m, e)}
            />
            {view === 'Arena' && (
              <button
                type="button"
                className="score-step"
                aria-label={`Augmenter le score de ${name}`}
                disabled={closed || !ready}
                onClick={() => type(m, i + 1, String(Math.min(99, Number(v[`score${i + 1}`] || 0) + 1)))}
              >
                +
              </button>
            )}
          </label>
        ))}
        {!closed && ready && <p className="pick-hint">Touchez le vainqueur · le score rapporte plus</p>}
        {m.pointsPending ? (
          <p role="status">
            <strong>Points en attente de validation</strong>
            {m.progressionConfirmedAt && m.winnerName ? ` · ${m.winnerName} qualifié(e)` : ''}. Le reste du tableau
            continue.
          </p>
        ) : m.isFinished ? (
          <div className="official-result">
            <p>
              {m.resultType === 'NO_SHOW'
                ? `Forfait (adversaire absent) · Victoire ${m.winnerName}`
                : m.resultType === 'MEDICAL_WITHDRAWAL'
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
          <MatchTiming match={withLiveLock(m)} now={now} hideChecked={checked.length === 1} />
        )}
        {!onPreviewSave && <MatchExtras match={m} prediction={p} />}
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
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      <>
        {newMatches.length > 0 && (
          <aside className="new-matches">
            <strong>{withCount(newMatches.length, 'nouvelle rencontre', 'nouvelles rencontres')} à pronostiquer</strong>{' '}
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
                  allValid.some((m) => String(m.id) === id && !closedMatch(m, now)),
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
          {(undoSave || undoMessage) && (
            <div className="ux-undo-message" role="status">
              <span>{undoSave ? 'Pronostic enregistré' : undoMessage}</span>
              {undoSave && (
                <button className="button-link" disabled={busy} onClick={undoLastSave}>
                  Annuler
                </button>
              )}
            </div>
          )}
          {multiphase && (
            <div className="tableau-phase-picker">
              <div className="filter-row" role="group" aria-label="Journée du tableau">
                {[
                  ['preliminary', 'J1 · Préliminaire'],
                  ['main', 'J2 · Principal'],
                ].map(([phase, label]) => (
                  <button
                    key={phase}
                    type="button"
                    aria-pressed={selectedPhase === phase}
                    onClick={() => choosePhase(phase)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="muted">
                {selectedPhase === 'preliminary' ? 'Tableau préliminaire du J1' : 'Tableau principal du J2'}
                {!valid.length ? ' · Pas encore publié.' : ''}
              </p>
            </div>
          )}
          <div className="board-head">
            <p className="board-summary">
              <strong>
                {valid.filter((m) => mine(m)).length}/{valid.length}
              </strong>{' '}
              enregistrés · <strong>{valid.filter((m) => !mine(m) && !closedMatch(m, now)).length}</strong> à compléter
            </p>
            <div className="filter-row view-toggle" role="group" aria-label="Affichage">
              {['Express', 'Arena', 'Liste', 'Arbre'].map((x) => (
                <button
                  key={x}
                  aria-pressed={view === x}
                  aria-label={VIEW_LABELS[x]}
                  title={VIEW_LABELS[x]}
                  onClick={() => {
                    setView(x);
                    try {
                      localStorage.setItem('pronos:match-view', x);
                    } catch {
                      /* Optional preference. */
                    }
                  }}
                >
                  <ViewIcon view={x} />
                  <span className="view-toggle-label">{VIEW_LABELS[x]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="board-toolbar">
            <div className="filter-row filter-scroll" role="group" aria-label="Filtrer les matchs">
              {[
                'Tous',
                ...(follows?.matchNames.length ? ['Mes tireurs'] : []),
                'À compléter',
                'Ferment bientôt',
                'En cours',
                'Résultats publiés',
              ].map((x) => (
                <button key={x} aria-pressed={filter === x} onClick={() => setFilter(x)}>
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
              disabled={!valid.some((m) => !mine(m) && !closedMatch(m, now))}
            >
              Pronostic suivant →
            </button>
          </div>
          {view === 'Express' ? (
            <div className="express-board">
              <p className="express-intro">
                Touchez le vainqueur de chaque match : c’est enregistré tout de suite. Le score exact (+3 points)
                s’ajoute ensuite, match par match.
              </p>
              {groups
                .filter((g) => g.items.some(visible))
                .map((g) => {
                  const items = g.items.filter(visible);
                  return (
                    <section className="express-round" key={g.round}>
                      <h2>
                        {roundLabel(g.round, multiphase)}
                        <small>
                          {items.filter((m) => mine(m)).length}/{items.length}
                        </small>
                      </h2>
                      <ul>
                        {items.map((m) => {
                          const closed = !ready || closedMatch(m, now);
                          const side = pickedSide(m, values(m));
                          const p = mine(m);
                          const saved = p && !drafts[m.id];
                          const exact = saved && !p.winnerOnly && Number.isInteger(p.predictedScore1);
                          return (
                            <li key={m.id} className={`express-row${closed ? ' is-closed' : ''}`}>
                              {[1, 2].map((i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className={`express-pick side-${i}${side === i ? ' is-picked' : ''}`}
                                  aria-pressed={side === i}
                                  disabled={closed}
                                  onClick={() => expressPick(m, i)}
                                >
                                  {m[`seed${i}`] ? <small>{m[`seed${i}`]}</small> : null}
                                  <span>{m[`player${i}`]}</span>
                                </button>
                              ))}
                              <span className="express-state">
                                {m.isFinished
                                  ? `${m.score1 ?? '–'}–${m.score2 ?? '–'}`
                                  : closed
                                    ? 'Clos'
                                    : exact
                                      ? `${p.predictedScore1}–${p.predictedScore2}`
                                      : saved
                                        ? '✓'
                                        : ''}
                              </span>
                              {!closed && saved && !exact && (
                                <button
                                  type="button"
                                  className="button-link express-score"
                                  onClick={() => {
                                    setView('Liste');
                                    setReveal({ id: m.id });
                                    setTimeout(() => {
                                      const el = document.getElementById(`match-${m.id}`);
                                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }, 60);
                                  }}
                                >
                                  + score exact
                                </button>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
            </div>
          ) : view === 'Arena' ? (
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
                    candidates.find((m) => !mine(m) && !closedMatch(m, now)) ||
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
                      {roundLabel(m.round, multiphase)} · {m.player1} / {m.player2}
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
                isClosed={(m) => closedMatch(m, now)}
                visible={visible}
                isFollowed={(name) => isFollowedFencer(follows, name)}
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
                  <h2>{roundLabel('Bronze', multiphase)}</h2>
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
                      {roundLabel(round, multiphase)}{' '}
                      {items.some((m) => m.pointsMultiplier > 1) && <BoostBadge compact />}{' '}
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
      {typingMatch && (
        <KeyboardBar>
          <span className="keyboard-bar-status">{typingStatus}</span>
          <button
            type="button"
            className="button-link"
            onPointerDown={(e) => {
              e.preventDefault();
              document.activeElement?.blur();
              setTypingId(null);
            }}
          >
            Fermer
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              // Action au toucher : le champ garde le focus, le clavier reste ouvert si besoin.
              e.preventDefault();
              nextFromBar();
            }}
          >
            Match suivant →
          </button>
        </KeyboardBar>
      )}
      {(dirty || busy) &&
        saveTarget &&
        createPortal(
          <button
            className="tableau-floating-save"
            disabled={busy || !ready}
            onClick={() => save(Object.keys(drafts))}
            title={withCount(Object.keys(drafts).length, 'saisie non enregistrée', 'saisies non enregistrées')}
          >
            {busy ? 'Enregistrement…' : 'Tout enregistrer'}
          </button>,
          saveTarget,
        )}
    </section>
  );
}
