import { rememberLoadedMatches } from './lib/seenMatches';
import useTableauByes from './components/useTableauByes';
import GlobalSearch from './components/GlobalSearch';
import GainAlerts from './components/GainAlerts';
import AfterPredictionInstall from './components/AfterPredictionInstall';
import TeamFollows from './components/TeamFollows';
import FencerNotifPrompt from './components/FencerNotifPrompt';
import { UxRoot } from './components/UxSettings';
import { scopeLabels, predictionTabs } from './lib/delegationScope';
import { RESULT_REFRESH_MS } from './lib/resultSync';
import { useResultSync } from './lib/useResultSync';
import { BoostBanner } from './components/BoostBadge';
import { boostedTab } from './lib/pointsBoost';
import ConnectionStatus from './components/ConnectionStatus';
import { reducedData } from './lib/fieldCache';
import { applyMode, dataMode, detector, setDataMode } from './lib/connectionQuality';
import { clearOutbox, flush as flushOutbox } from './lib/outbox';
import AdminAlerts from './components/AdminAlerts';
import AdminNav from './components/AdminNav';
import { sectionForDestination, storedSection, storeSection } from './lib/adminSections';
import SupportContact from './components/SupportContact';
import { adminDestination, adminLoginPath, loginReturn, updateBadge } from './lib/adminDestination';
import ClubModeration from './components/ClubModeration';
import AppTutorial from './components/AppTutorial';
import ClubChoice from './components/ClubChoice';
import ClubProfile from './components/ClubProfile';
import ClubAdministration from './components/ClubAdministration';
import FencerAffiliationAdministration from './components/FencerAffiliationAdministration';
import AdminFencerAliases from './components/AdminFencerAliases';
import { CompetitionFollow } from './components/EventWorkspace';
import StandingsAccess from './components/StandingsAccess';
import { FencerFollowsProvider } from './components/FencerFollowsProvider';
import { isAuthPath, authPath } from './lib/authNavigation';
import { ArenaHome, PisteFencers } from './components/PisteExperience';
import PisteLive from './components/PisteLive';
import { eventLanding } from './components/matchPresentation';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import API, { consultationCache, SESSION_EXPIRED_EVENT } from './api';
import { shouldRefresh } from './lib/session.js';
import EventSelector from './components/EventSelector';
import UpdateBanner from './components/UpdateBanner';
import NotificationBanner from './components/NotificationBanner';
import { ForgotPassword, ResetPassword } from './components/AccountRecovery';
import { LegalPage, LegalLinks } from './components/LegalPages';
import { legalPageFor } from './lib/legal.js';
import { refonteOn, setRefonte } from './lib/refonte';
import { NAV_CATALOG, NAV2_CATALOG, NAV2_KEY, mobileSlots, readNav, saveNav } from './lib/navPrefs';
import NavEditor from './components/NavEditor';
import { setReloadBlocked } from './lib/chunkReload';
import { nav2On, setNav2, NAV2_TABS, nav2Active, otherSections } from './lib/nav2';
import MySpace, { HubTrail } from './components/MySpace';
import EventCards from './components/EventCards';
import ClubRanking from './components/ClubRanking';
import LiveFollowAlert from './components/LiveFollowAlert';
import { useLiveScores } from './lib/useLiveScores';
import { hasActiveLiveScore } from './lib/liveScoreState';
import { useI18n } from './i18n/context';
import { TAB_TITLES, idOf, parseLocation, pathFor, pathForTab, tabFromPath } from './lib/routes.js';
import { captureInvitation, clearInvitation } from './lib/invitation.js';
import ResultFreshness from './components/ResultFreshness';
import ClosingCountdown from './components/ClosingCountdown';
import InstallApp from './components/InstallApp';
import DataModeSettings from './components/DataModeSettings';
import NotificationSettings from './components/NotificationSettings';
import { disableThisDevice } from './lib/notifications';
import MatchBoard from './components/MatchBoard';
import './interface.css';
import ErrorBoundary from './components/ErrorBoundary';
import { pollWhileVisible } from './lib/polling';
import BrandMark from './components/BrandMark';
import Landing from './components/Landing';
import UpcomingCalendar from './components/UpcomingCalendar';
// Outils d'administration chargés à la demande : les joueurs ne les téléchargent jamais.
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const FtlControl = lazy(() => import('./components/FtlControl'));
const CircuitSettings = lazy(() => import('./components/CircuitSettings'));
const SyncHealth = lazy(() => import('./components/SyncHealth'));
const CalendarWatch = lazy(() => import('./components/CalendarWatch'));
const AdminFtlDiscovery = lazy(() => import('./components/AdminFtlDiscovery'));
const FtlTournamentSetup = lazy(() => import('./components/FtlTournamentSetup'));
const AdminAnnouncements = lazy(() => import('./components/AdminAnnouncements'));
const AdminJournal = lazy(() => import('./components/AdminJournal'));
const adminFallback = <p className="muted">Chargement des outils d’administration…</p>;
// Onglets secondaires chargés à la première ouverture : l'écran des matchs s'affiche plus vite.
const PodiumPrediction = lazy(() => import('./components/PodiumPrediction'));
const PoolPredictions = lazy(() => import('./components/PoolPredictions'));
const GlobalLeaderboard = lazy(() => import('./components/GlobalLeaderboard'));
const MyPredictions = lazy(() => import('./components/MyPredictions'));
const MySeason = lazy(() => import('./components/MySeason'));
const Results = lazy(() => import('./components/Results'));
const PublicTournament = lazy(() => import('./components/PublicTournament'));
const PublicResults = lazy(() => import('./components/PublicResults'));
const PublicCalendar = lazy(() => import('./components/PublicCalendar'));
const RedesignHome = lazy(() => import('./components/RedesignHome'));
const REFONTE = refonteOn();
const NAV2 = nav2On();
const LIVE_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" />
  </svg>
);
const HOME_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4Z" strokeLinejoin="round" />
  </svg>
);
const HUB_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c.9-4 3.8-6.2 7.5-6.2s6.6 2.2 7.5 6.2" />
  </svg>
);
const COMMUNITY_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9.5" r="2.4" />
    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M15 14.2c2.6-.3 4.6 1.3 5.3 4.3" />
  </svg>
);
// Refonte : la barre suit le choix du joueur (3 à 5 onglets, dans son ordre).
const customNav = (items, ids) => {
  const byId = Object.fromEntries(items.map((item) => [item[0], item]));
  // Maison dessinée (et non le caractère « ⌂ », que la police place trop bas dans le cercle).
  if (byId.home) byId.home = ['home', HOME_ICON, byId.home[2]];
  byId.live = ['live', LIVE_ICON, 'Direct'];
  byId.community = ['community', COMMUNITY_ICON, 'Délégations'];
  byId.hub = ['hub', HUB_ICON, 'Mon espace'];
  return ids.map((id) => byId[id]).filter(Boolean);
};
const MORE_ICON = (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
    <circle cx="6" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="18" cy="12" r="1.8" />
  </svg>
);
// Bascule temporaire entre les deux designs, avec choix mémorisé sur cet appareil.
function RefonteToggle() {
  const { t } = useI18n();
  if (NAV2)
    return (
      <div className="floating-actions">
        <div id="pool-save-action" />
      </div>
    );
  return (
    <div className="floating-actions">
      <div id="pool-save-action" />
      <button type="button" className="refonte-toggle" onClick={() => setRefonte(!REFONTE)}>
        {REFONTE ? t('refonte.toOld') : t('refonte.toNew')}
      </button>
    </div>
  );
}
const AccountSettings = lazy(() => import('./components/AccountSettings'));
const Community = lazy(() => import('./components/Community'));
const tabFallback = <p className="muted load-state">Chargement…</p>;

export default function App() {
  const [globalSearch, setGlobalSearch] = useState(false);
  // Lien d'invitation (/rejoindre/<code>) : lu avant tout le reste, l'adresse redevient « / ».
  const [tutorialRequest, setTutorialRequest] = useState(0);
  // Arrivée par un lien précis (notification, partage, tableau) : ne pas lancer le tutoriel
  // automatiquement, il ramènerait sur l'accueil ; il reste disponible depuis le menu.
  const [landedOnLink] = useState(
    () =>
      !/^\/(accueil|connexion|inscription)?\/?$/.test(window.location.pathname) ||
      /[?&](tournament|event)=/.test(window.location.search),
  );
  const { t, lang, setLang } = useI18n();
  const [navTabs, setNavTabs] = useState(() => (NAV2 ? readNav(NAV2_TABS, NAV2_CATALOG, NAV2_KEY) : readNav()));
  const [navEditor, setNavEditor] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const accountMenu = useRef(null);
  useEffect(() => {
    if (!accountOpen) return;
    const close = (e) => {
      if (!accountMenu.current?.contains(e.target)) setAccountOpen(false);
    };
    const escape = (e) => {
      if (e.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [accountOpen]);
  const [invitation, setInvitation] = useState(() => captureInvitation());
  const [inviteNotice, setInviteNotice] = useState('');
  const joining = useRef(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const verifiedUser = useRef(null);
  const [sessionError, setSessionError] = useState(false);
  const [sessionRetry, setSessionRetry] = useState(0);
  const [isRegister] = useState(() => location.pathname.startsWith('/inscription'));
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(location.search).get('reset'));
  const legalPage = legalPageFor(location.pathname);
  useEffect(() => {
    API.get('/auth/config')
      .then(({ data }) => setPasswordReset(Boolean(data.passwordReset)))
      .catch(() => setPasswordReset(false));
  }, []);
  const closeReset = () => {
    setResetToken(null);
    history.replaceState(null, '', location.pathname);
  };
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');

  // Navigation principale
  const [adminTarget, setAdminTarget] = useState(() =>
    adminDestination(
      loginReturn(location.search) ? new URL(loginReturn(location.search), location.origin).search : location.search,
    ),
  );
  // Rubrique de l'administration : celle d'une alerte ouverte, sinon la dernière consultée.
  const [adminSection, setAdminSection] = useState(
    () => sectionForDestination(adminTarget) || storedSection() || 'event',
  );
  useEffect(() => {
    const section = sectionForDestination(adminTarget);
    if (section) setAdminSection(section);
  }, [adminTarget]);
  const [detectedEvent, setDetectedEvent] = useState(null);
  const chooseAdminSection = (section) => {
    setAdminSection(section);
    storeSection(section);
  };
  const [mainTab, setMainTab] = useState(
    () =>
      (loginReturn(location.search)
        ? 'admin'
        : (location.pathname === '/' || isAuthPath(location.pathname)) &&
            /[?&](event|tournament|match|matches|view)=/.test(location.search)
          ? // Ancien lien de notification « suivi » : ouvre Direct & résultats.
            new URLSearchParams(location.search).get('view') === 'follow'
            ? 'live'
            : 'play'
          : tabFromPath(location.pathname)) || 'home',
  );
  useEffect(() => {
    if (user && isAuthPath(location.pathname)) {
      const target = loginReturn(location.search);
      history.replaceState(null, '', target || `/accueil${location.search}`);
      if (target) {
        setMainTab('admin');
        setAdminTarget(adminDestination(new URL(target, location.origin).search));
      }
    }
  }, [user]);
  // Une adresse par section : l'onglet suit l'adresse (retour arrière du navigateur) et inversement.
  const [matchTarget, setMatchTarget] = useState(() => {
    const id = Number(new URLSearchParams(location.search).get('match'));
    return Number.isSafeInteger(id) && id > 0 ? { id } : null;
  });

  // Gestion des compétitions et tournoi actif
  const [tournamentId, setTournamentId] = useState(null);
  const [eventListVersion, setEventListVersion] = useState(0);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  useResultSync([selectedCompetitionId]);
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current = selectedCompetitionId;
  }, [selectedCompetitionId]);

  const [matches, setMatches] = useState([]);
  const headerScores = useLiveScores(
    selectedCompetitionId,
    REFONTE && !!user && matches.some((m) => m.competitionId === selectedCompetitionId && !m.isFinished),
  );
  const showHeaderLive = hasActiveLiveScore(headerScores, matches, selectedCompetitionId);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [competition, setCompetition] = useState(null);
  const tableauByes = useTableauByes(user ? selectedCompetitionId : null, competition?.tableauByes);
  const [playTab, setPlayTab] = useState('tableau');
  const [delegationContext, setDelegationContext] = useState(null);
  useEffect(() => {
    setDelegationContext(null);
  }, [user?.id]);
  useEffect(() => {
    if (!delegationContext || mainTab !== 'play') return;
    const c = new AbortController();
    API.get(`/community/leagues/${delegationContext.id}`, { signal: c.signal })
      .then(({ data }) => {
        if (!c.signal.aborted)
          setDelegationContext({
            id: data.league.id,
            name: data.league.name,
            scope: data.league.predictionScope || 'ALL',
          });
      })
      .catch(() => {
        if (!c.signal.aborted) setDelegationContext(null);
      });
    return () => c.abort();
  }, [delegationContext?.id, mainTab]);
  useEffect(() => {
    const tabs = predictionTabs(delegationContext?.scope);
    if (tabs.length && !tabs.some(([id]) => id === playTab)) setPlayTab(tabs[0][0]);
  }, [delegationContext?.scope, playTab]);
  // Retour arrière vers une autre épreuve : le sélecteur relit l'adresse.
  useEffect(() => {
    const back = () => {
      const loc = parseLocation(location.pathname, location.search);
      if (!loc.tab) return;
      setAdminTarget(adminDestination(location.search));
      setMainTab(loc.tab);
      if (['play', 'admin'].includes(loc.tab) && loc.eventId && loc.eventId !== selectedRef.current)
        setEventListVersion((v) => v + 1);
      if (loc.tab === 'play' && loc.view) setPlayTab(loc.view);
    };
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  // Direct & résultats : rencontres, poules, tableau ou classement de l'épreuve choisie.
  const [liveView, setLiveView] = useState('matches');
  const [rankingView, setRankingView] = useState('players');
  const [liveMatchId, setLiveMatchId] = useState(null);
  const [landingPending, setLandingPending] = useState(false);
  const [landingFilter, setLandingFilter] = useState('Tous');
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setReloadBlocked(dirty);
    const protect = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', protect);
    return () => {
      window.removeEventListener('beforeunload', protect);
    };
  }, [dirty]);
  const [matchesReady, setMatchesReady] = useState(false);
  const [matchesError, setMatchesError] = useState('');
  // Données déjà affichées mais dernier rafraîchissement raté (wifi de salle) : on prévient sans bloquer.
  const [matchesStale, setMatchesStale] = useState(false);
  const [matchesAttempt, setMatchesAttempt] = useState(0);
  useEffect(() => {
    rememberLoadedMatches({
      userId: user?.id,
      competitionId: selectedCompetitionId,
      matches,
      ready: matchesReady,
      stale: matchesStale,
      error: matchesError,
      visible: mainTab === 'play' || mainTab === 'live',
    });
  }, [user?.id, selectedCompetitionId, matches, matchesReady, matchesStale, matchesError, mainTab]);

  const matchesLoaded = useRef(false);
  const [accountClub, setAccountClub] = useState(null);
  useEffect(() => {
    setAccountClub(null);
    if (!user) return;
    const c = new AbortController();
    const refresh = () =>
      API.get('/clubs/me', { signal: c.signal })
        .then(({ data }) => {
          if (!c.signal.aborted) setAccountClub(data.club || null);
        })
        .catch(() => {});
    refresh();
    window.addEventListener('club-profile-changed', refresh);
    return () => {
      c.abort();
      window.removeEventListener('club-profile-changed', refresh);
    };
  }, [user]);
  useEffect(() => {
    if (!landingPending || !matchesReady) return;
    const next = eventLanding(matches, user?.id, Date.now(), competition?.podiumFormat === 'TEAM');
    setPlayTab(next.tab);
    setLandingFilter(next.filter);
    setLandingPending(false);
  }, [landingPending, matchesReady, matches, user?.id, competition]);

  // Une adresse par section, tournoi, épreuve et vue (/pronostiquer/<tournoi>/<épreuve>/poules).
  useEffect(() => {
    if (!user || !tabFromPath(location.pathname)) return;
    const current = parseLocation(location.pathname, location.search);
    const legacy = /[?&](tournament|event|view)=/.test(location.search);
    let target;
    if (['play', 'admin'].includes(mainTab)) {
      target =
        selectedCompetitionId && tournamentInfo?.id && competition
          ? pathFor(mainTab, {
              tournament: tournamentInfo,
              event: { id: selectedCompetitionId, name: competition.name },
              view: mainTab === 'play' ? playTab : null,
            })
          : pathForTab(mainTab);
      // Épreuve de l'adresse en cours de chargement : l'adresse est gardée.
      if (!selectedCompetitionId && current.tab === mainTab && current.eventId) target = location.pathname;
    } else target = current.tab === mainTab ? location.pathname : pathForTab(mainTab);
    const query = new URLSearchParams(location.search);
    if (legacy) {
      query.delete('event');
      query.delete('tournament');
      query.delete('view');
    }
    if (mainTab !== 'admin') {
      query.delete('panel');
      query.delete('request');
    }
    const url = target + (query.size ? `?${query}` : '');
    if (location.pathname + location.search !== url) {
      const next = parseLocation(target);
      // Accueil « / », ancien lien, simple changement de vue ou de nom : pas d'étape en plus dans l'historique.
      const replace =
        location.pathname === '/' ||
        legacy ||
        (current.tab === next.tab && current.eventId === next.eventId && current.tournamentId === next.tournamentId);
      history[replace ? 'replaceState' : 'pushState'](null, '', url);
    }
    document.title = [competition && ['play', 'admin'].includes(mainTab) ? competition.name : null, TAB_TITLES[mainTab]]
      .filter(Boolean)
      .concat('Pronos Escrime')
      .join(' · ');
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `https://www.pronos-escrime.fr${target}`;
  }, [mainTab, user, selectedCompetitionId, tournamentInfo, competition, playTab]);

  // Connecté avec une invitation en attente : le groupe est rejoint, puis Communauté s'ouvre sur son tournoi.
  useEffect(() => {
    if (!user || !invitation || joining.current) return;
    joining.current = true;
    clearInvitation();
    (async () => {
      try {
        const { data } = await API.post('/community/join', { code: invitation });
        const league = data.league;
        history.replaceState(null, '', '/communaute');
        setInviteNotice(`Vous avez rejoint « ${league.name} ». Bienvenue !`);
      } catch (e) {
        setInviteNotice(e.response?.data?.error || 'Impossible de rejoindre le délégation. Réessayez avec le code.');
      }
      setInvitation(null);
      setMainTab('community');
      joining.current = false;
    })();
  }, [user, invitation]);

  const [pendingNavigation, setPendingNavigation] = useState(null);
  const runNavigation = (action) => {
    if (dirty) setPendingNavigation(() => action);
    else action();
  };
  const navigate = (tab) =>
    runNavigation(() => {
      setDirty(false);
      setMainTab(tab);
    });

  const openEventStandings = () =>
    runNavigation(() => {
      setDirty(false);
      setLiveView('ranking');
      setMainTab('live');
    });

  const openAdminAlert = (panel) =>
    runNavigation(() => {
      history.pushState(null, '', `/admin?panel=${panel}`);
      setAdminTarget({ panel, requestId: null });
      setMainTab('admin');
    });

  // 2. Charger les matchs en fonction de la compétition
  // force : relire au serveur, sans la copie gardée sur l'appareil (après un refus pour clôture).
  const fetchMatches = async (compId, { force = false } = {}) => {
    if (!compId) return;
    try {
      const res = await API.get(`/matches?competitionId=${compId}`, force ? { forceRefresh: true } : undefined);
      setMatches(res.data);
      setMatchesReady(true);
      setMatchesError('');
      setMatchesStale(false);
    } catch {
      setMatchesStale(true);
    }
  };

  useEffect(() => {
    if (!selectedCompetitionId) return;
    const controller = new AbortController();
    const refreshMatches = () =>
      API.get(`/matches?competitionId=${selectedCompetitionId}`, { signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            matchesLoaded.current = true;
            setMatches(data);
            setMatchesReady(true);
            setMatchesError('');
            setMatchesStale(false);
          }
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          // Tant qu'aucune donnée n'est chargée : erreur visible ; ensuite : simple avertissement.
          if (matchesLoaded.current) setMatchesStale(true);
          else setMatchesError('Impossible de charger les matchs. Vérifiez votre connexion.');
        });
    refreshMatches();
    const stopPolling = pollWhileVisible(refreshMatches, RESULT_REFRESH_MS);
    return () => {
      controller.abort();
      stopPolling();
    };
  }, [selectedCompetitionId, matchesAttempt]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.fromCache && verifiedUser.current ? verifiedUser.current : res.data);
          // Session glissante : renouvelée à chaque visite après un jour, pour 30 jours.
          if (shouldRefresh(token))
            API.post('/auth/refresh')
              .then(({ data }) => data.token && localStorage.setItem('token', data.token))
              .catch(() => {});
        } catch (err) {
          if (![401, 403, 404].includes(err.response?.status)) {
            setSessionError(true);
            setLoading(false);
            return;
          }
          consultationCache.clear();
          verifiedUser.current = null;
          localStorage.removeItem('token');
          setUser(null);
          const next = adminLoginPath(location.pathname, location.search);
          if (next) history.replaceState(null, '', next);
        }
      }
      if (!token) {
        const next = adminLoginPath(location.pathname, location.search);
        if (next) history.replaceState(null, '', next);
      }
      setLoading(false);
    };
    setSessionError(false);
    setLoading(true);
    checkAuth();
  }, [sessionRetry]);

  useEffect(() => {
    const checked = (event) => {
      if (event.detail?.user) {
        verifiedUser.current = event.detail.user;
        setUser(event.detail.user);
      }
      if (event.detail?.path === '/auth/me' && [401, 403, 404].includes(event.detail?.error?.response?.status))
        expired();
    };
    window.addEventListener('pronos:consultation-updated', checked);
    const expired = () => {
      consultationCache.clear();
      verifiedUser.current = null;
      setUser(null);
      const next = adminLoginPath(location.pathname, location.search);
      if (next) history.replaceState(null, '', next);
      setError('Votre session a expiré. Reconnectez-vous pour continuer.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
      window.removeEventListener('pronos:consultation-updated', checked);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isRegister && !formData.clubChoice) {
      setError('Choisissez votre club ou « sans club / accompagnant ».');
      return;
    }
    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const res = await API.post(endpoint, twoFactor && !isRegister ? { ...formData, code: twoFactorCode } : formData);
      const token = res.data.token;
      setTwoFactor(false);
      setTwoFactorCode('');

      consultationCache.clear();
      verifiedUser.current = null;
      localStorage.setItem('token', token);
      setUser(res.data.user);
      void flushOutbox(); // reprendre uniquement les attentes du compte qui vient de se reconnecter
      if (selectedCompetitionId) fetchMatches(selectedCompetitionId);
    } catch (err) {
      if (err.response?.data?.twoFactorRequired) {
        setTwoFactor(true);
        setTwoFactorCode('');
      }
      const errorMsg =
        err.response?.data?.error || err.response?.data?.message || err.message || 'Une erreur est survenue';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const handleLogout = async () => {
    try {
      await disableThisDevice();
    } catch {
      setError('Déconnexion impossible : les alertes de cet appareil n’ont pas pu être désactivées. Réessayez.');
      return;
    }
    consultationCache.clear();
    clearOutbox();
    verifiedUser.current = null;
    localStorage.removeItem('token');
    await updateBadge(0);
    setUser(null);
    setTournamentId(null);
    selectCompetition(null);
    setMainTab('play');
    history.replaceState(null, '', '/');
  };

  const selectCompetition = (competitionId) => {
    if (competitionId === selectedCompetitionId) return;
    setMatches([]);
    setLandingPending(true);
    setDirty(false);
    setMatchesReady(false);
    setMatchesError('');
    setMatchesStale(false);
    matchesLoaded.current = false;
    setSelectedCompetitionId(competitionId);
  };

  // Maquette navigation 2 : ouverture d'une épreuve depuis sa carte (même chemin qu'un lien partagé).
  const openEvent = (tournament, event) =>
    runNavigation(() => {
      setDirty(false);
      setTournamentId(tournament.id);
      setTournamentInfo({ id: tournament.id, name: tournament.name });
      selectCompetition(event.id);
      setCompetition(event);
      setPlayTab('tableau');
      history.pushState(null, '', pathFor('play', { tournament, event, view: 'tableau' }));
      setEventListVersion((v) => v + 1);
      setMainTab('play');
    });
  // Ouvre l'épreuve d'un tireur suivi : pour pronostiquer (Pronostiquer) ou pour suivre (Direct & résultats).
  const openFollowedFencer = ({ event, match, mode, tournament }) =>
    runNavigation(() => {
      const follow = mode === 'follow';
      setDirty(false);
      selectCompetition(event.id);
      setCompetition(event);
      setLandingPending(false);
      setEventListVersion((v) => v + 1);
      setPlayTab('tableau');
      if (follow) {
        setLiveView(match ? 'tableau' : 'pools');
        setLiveMatchId(match?.id || null);
      } else setMatchTarget({ id: match.id, at: Date.now() });
      history.replaceState(
        null,
        '',
        pathFor(follow ? 'live' : 'play', {
          tournament: tournament || tournamentInfo,
          event,
          view: follow ? null : 'tableau',
        }),
      );
      setMainTab(follow ? 'live' : 'play');
    });

  // Page publique d'un tournoi ou d'une épreuve (/tournoi/etampes-4, /tournoi/etampes-4/fleuret-dames-13).
  const publicMatch = /^\/tournoi\/([^/]+)(?:\/([^/]+))?\/?$/.exec(location.pathname);
  const publicTournament = publicMatch ? idOf(publicMatch[1]) : null;
  if (publicTournament)
    return (
      <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '100px' }}>Chargement…</p>}>
        <PublicTournament id={publicTournament} eventId={idOf(publicMatch[2])} />
      </Suspense>
    );
  if (legalPage) return <LegalPage page={legalPage} />;
  // Maquette de refonte, consultable à côté du site actuel (/maquette).
  if (/^\/maquette\/?$/.test(location.pathname))
    return (
      <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '100px' }}>Chargement…</p>}>
        <RedesignHome />
      </Suspense>
    );
  // Calendrier des épreuves (/calendrier), lisible avec ou sans compte.
  if (/^\/calendrier\/?$/.test(location.pathname))
    return (
      <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '100px' }}>Chargement…</p>}>
        <PublicCalendar />
      </Suspense>
    );
  // Résultats consultables sans compte (/resultats) ; une fois connecté, l'onglet habituel s'affiche.
  if (!loading && !user && tabFromPath(location.pathname) === 'results')
    return (
      <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '100px' }}>Chargement…</p>}>
        <PublicResults />
      </Suspense>
    );
  if (resetToken)
    return (
      <div className="auth-card">
        <ResetPassword token={resetToken} onDone={closeReset} />
      </div>
    );
  if (sessionError)
    return (
      <main className="auth-card">
        <h2>Connexion temporairement indisponible</h2>
        <p>Votre session est conservée. Vérifiez votre connexion puis réessayez.</p>
        <button onClick={() => setSessionRetry((n) => n + 1)}>Réessayer</button>
      </main>
    );
  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px' }}>Chargement de la session...</div>;
  }

  if (user) {
    const team = competition?.podiumFormat === 'TEAM';
    return (
      <FencerFollowsProvider key={user.id} userId={user.id} competitionId={selectedCompetitionId}>
        <div className="app-shell redesigned">
          <RefonteToggle />
          {navEditor && (
            <NavEditor
              value={navTabs}
              {...(NAV2 ? { catalog: NAV2_CATALOG, defaults: NAV2_TABS } : {})}
              onClose={() => setNavEditor(false)}
              onSave={(list) => {
                saveNav(NAV2 ? list || NAV2_TABS : list, NAV2 ? NAV2_KEY : undefined);
                setNavTabs(list);
                setNavEditor(false);
              }}
            />
          )}
          <header className="app-header">
            <div className="brand">
              <BrandMark />
              pronos<span>escrime</span>
            </div>
            <div className="account-actions">
              <button
                className="ux-search-trigger button-link"
                aria-label="Rechercher dans l’application"
                title="Rechercher"
                onClick={() => setGlobalSearch(true)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="10" r="6" />
                  <path d="m15 15 5 5" />
                </svg>
              </button>
              <ConnectionStatus compact />
              {REFONTE && showHeaderLive && (
                <button
                  type="button"
                  className="header-live"
                  aria-current={['live', 'results'].includes(mainTab) ? 'page' : undefined}
                  onClick={() => navigate('live')}
                >
                  <span className="header-live-dot" aria-hidden="true" />
                  {t('nav.live')}
                </button>
              )}
              <AdminAlerts user={user} onOpen={openAdminAlert} />
              <div
                className="user-menu"
                ref={accountMenu}
                onMouseEnter={() => {
                  if (!NAV2 && matchMedia('(hover: hover)').matches) setAccountOpen(true);
                }}
                onMouseLeave={() => {
                  if (matchMedia('(hover: hover)').matches) setAccountOpen(false);
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setAccountOpen(false);
                }}
              >
                <button
                  className="button-secondary user-menu-trigger"
                  aria-expanded={accountOpen}
                  aria-controls="user-options"
                  onClick={(e) => {
                    // Maquette navigation 2 : le nom du joueur ouvre « Mon espace ».
                    if (NAV2) return navigate('hub');
                    if (e.detail > 0 && matchMedia('(hover: hover)').matches) setAccountOpen(true);
                    else setAccountOpen((v) => !v);
                  }}
                >
                  {user.name || user.username}
                  {NAV2 ? '' : ' ⌄'}
                </button>
                {accountOpen && (
                  <nav id="user-options" className="user-menu-panel" aria-label={t('menu.space')}>
                    {/* Sections hors barre principale : chacune n'apparaît qu'ici (aucun doublon). */}
                    {[
                      ...(NAV2
                        ? [['hub', 'Mon espace']]
                        : REFONTE
                          ? NAV_CATALOG.filter(([id]) => id !== 'live' && !navTabs.includes(id))
                          : [
                              ['live', 'Direct & résultats'],
                              ['community', 'Délégations'],
                            ]),
                      ['account', 'Mon compte et notifications'],
                      ...(user.isAdmin ? [['admin', 'Administration']] : []),
                    ].map(([id]) => (
                      <button
                        key={id}
                        aria-current={mainTab === id || (id === 'live' && mainTab === 'results') ? 'page' : undefined}
                        onClick={() => {
                          setAccountOpen(false);
                          navigate(id);
                        }}
                      >
                        {id === 'hub'
                          ? 'Mon espace'
                          : id === 'account'
                            ? t('menu.account')
                            : id === 'admin'
                              ? t('menu.admin')
                              : id === 'live' && !REFONTE
                                ? t('menu.liveResults')
                                : t(`nav.${id}`)}
                      </button>
                    ))}
                    {!NAV2 && (
                      <button onClick={() => runNavigation(() => setNav2(true))}>Activer la nouvelle navigation</button>
                    )}
                    {REFONTE && !NAV2 && (
                      <button
                        onClick={() => {
                          setAccountOpen(false);
                          setNavEditor(true);
                        }}
                      >
                        {t('menu.customize')}
                      </button>
                    )}
                    <p className="user-menu-group">{t('menu.help')}</p>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        setTutorialRequest((v) => v + 1);
                      }}
                    >
                      {t('menu.tutorial')}
                    </button>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        setSupportOpen(true);
                      }}
                    >
                      {t('menu.support')}
                    </button>
                    {import.meta.env.DEV && (
                      <button
                        aria-label={t('lang.switchAria')}
                        onClick={() => {
                          setAccountOpen(false);
                          setLang(lang === 'fr' ? 'en' : 'fr');
                        }}
                      >
                        {t('lang.label')} : {t('lang.switch')}
                      </button>
                    )}
                    <button
                      className="user-menu-separated"
                      onClick={() => {
                        // Activé (par vous ou automatiquement) : on revient au mode normal ; sinon on l'active.
                        if (reducedData()) {
                          if (dataMode() === 'on') setDataMode('auto');
                          else {
                            detector?.reset();
                            applyMode();
                          }
                        } else setDataMode('on');
                        setAccountOpen(false);
                      }}
                    >
                      {reducedData() ? t('menu.lowDataOff') : t('menu.lowData')}
                    </button>
                    <button
                      className="user-menu-logout"
                      onClick={() => {
                        setAccountOpen(false);
                        runNavigation(handleLogout);
                      }}
                    >
                      {t('menu.logout')}
                    </button>
                  </nav>
                )}
              </div>
            </div>
          </header>
          {supportOpen && <SupportContact onClose={() => setSupportOpen(false)} />}
          <AppTutorial
            key={user.id}
            userId={user.id}
            seenInAccount={Boolean(user.tutorialSeenAt)}
            skipAutomatic={Boolean(adminTarget) || landedOnLink}
            request={tutorialRequest}
            onNavigate={(step) =>
              runNavigation(() => {
                setMainTab(step.tab);
                if (step.view) {
                  setPlayTab(step.view);
                  setLandingPending(false);
                }
              })
            }
          />
          <UpdateBanner onReload={runNavigation} />
          <LiveFollowAlert userId={user.id} competitionId={selectedCompetitionId} onOpen={() => navigate('live')} />
          <UxRoot key={`ux:${user.id}`} userId={user.id} />
          <GainAlerts key={`gains:${user.id}`} userId={user.id} />
          <AfterPredictionInstall key={`install:${user.id}`} userId={user.id} />
          <FencerNotifPrompt
            key={`fencer-notif:${user.id}`}
            userId={user.id}
            onOpenSettings={() => navigate('account')}
          />
          {globalSearch && (
            <GlobalSearch
              onClose={() => setGlobalSearch(false)}
              onNavigate={navigate}
              onOpenEvent={openFollowedFencer}
            />
          )}
          <NotificationBanner userId={user.id} />
          <nav className="primary-nav" aria-label={t('nav.main')}>
            {[
              ['home', '⌂', 'Accueil'],
              ['play', '◎', 'Pronostiquer'],
              [
                'mine',
                <svg
                  key="mine"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <rect x="4" y="3" width="16" height="18" rx="2.5" />
                  <path d="m8 9 1.8 1.8L13 7.5M8 15.5h8M15 10h1" />
                </svg>,
                'Mes pronos',
              ],
              [
                'leaderboard',
                <svg
                  key="podium"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <path d="M2 21V11h6V5h8v10h6v6ZM8 11v10M16 15v6" />
                  <path d="M12 8v6" />
                </svg>,
                'Classements',
              ],
              [
                'me',
                <svg
                  key="fencers"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <path d="M9 15 21 3M6 13c2-1 5 1 4 5M7.5 16.5 4 20" />
                </svg>,
                'Mes tireurs',
              ],
            ]
              .flatMap((item, i, items) =>
                REFONTE
                  ? i
                    ? []
                    : [
                        ...customNav(items, navTabs),
                        ...('more' in mobileSlots(navTabs) ? [['more', MORE_ICON, 'Plus']] : []),
                      ]
                  : [item],
              )
              .map(([id, icon]) => (
                <button
                  key={id}
                  data-tab={id}
                  className={REFONTE && id === 'home' ? 'nav-home' : id === 'more' ? 'nav-more' : undefined}
                  style={REFONTE ? { '--mobile-order': mobileSlots(navTabs)[id] } : undefined}
                  aria-pressed={
                    (NAV2 && nav2Active(mainTab, navTabs) === id) ||
                    mainTab === id ||
                    (id === 'mine' && mainTab === 'season') ||
                    (id === 'live' && mainTab === 'results')
                  }
                  onClick={() => (id === 'more' ? (NAV2 ? navigate('hub') : setAccountOpen(true)) : navigate(id))}
                >
                  <span aria-hidden="true">{icon}</span>
                  {t(`nav.${id}`)}
                </button>
              ))}
            {accountClub?.name && (
              <div className="arena-club">
                <span>VOTRE CLUB</span>
                <strong>{accountClub.name}</strong>
                <button onClick={() => navigate('community')}>Retrouver la délégation →</button>
              </div>
            )}
          </nav>
          {error && <p role="alert">{error}</p>}
          <ErrorBoundary zone="contenu" resetKey={`${mainTab}:${playTab}:${selectedCompetitionId}`}>
            <Suspense fallback={tabFallback}>
              {mainTab === 'admin' && user.isAdmin && (
                <>
                  <AdminNav section={adminSection} onChange={chooseAdminSection} />
                  <Suspense fallback={adminFallback}>
                    {adminSection === 'tournaments' && (
                      <>
                        <AdminFtlDiscovery onPrepare={setDetectedEvent} />
                        <FtlTournamentSetup
                          key={detectedEvent?.eventId || 'manual'}
                          initialEvent={detectedEvent}
                          onConfigured={() => setEventListVersion((v) => v + 1)}
                        />
                        <CalendarWatch />
                        <CircuitSettings />
                      </>
                    )}
                    {adminSection === 'clubs' && (
                      <>
                        <ClubModeration destination={adminTarget} onSecurity={() => navigate('account')} />
                        <ClubAdministration />
                        <FencerAffiliationAdministration />
                        <AdminFencerAliases />
                      </>
                    )}
                    {adminSection === 'sync' && <SyncHealth destination={adminTarget} />}
                    {adminSection === 'journal' && <AdminJournal />}
                    {adminSection === 'announcements' && <AdminAnnouncements />}
                  </Suspense>
                </>
              )}
              {mainTab === 'me' && (
                <section className="piste-me feature-panel">
                  <p className="arena-eyebrow">VOTRE BORD DE PISTE</p>
                  <h1>Mes tireurs</h1>
                  <PisteFencers
                    key={user.id}
                    userId={user.id}
                    tournamentId={tournamentId}
                    onOpen={openFollowedFencer}
                  />
                </section>
              )}
              {mainTab === 'home' && (
                <>
                  <ClubProfile key={user.id} prompt />
                  {REFONTE ? (
                    <RedesignHome user={user} onNavigate={navigate} />
                  ) : (
                    <ArenaHome
                      onFollowedFencer={openFollowedFencer}
                      user={user}
                      matches={matches}
                      competition={competition}
                      tournament={tournamentInfo}
                      onPlay={() => navigate('play')}
                      onMine={() => navigate('season')}
                      onCommunity={() => navigate('community')}
                      onLive={() => navigate('live')}
                    />
                  )}
                </>
              )}
              {['live', 'results'].includes(mainTab) && (
                <nav className="secondary-nav hub-nav" aria-label="Direct et résultats">
                  {[
                    ['live', NAV2 ? 'Épreuve suivie' : 'En direct'],
                    ['results', NAV2 ? 'Tous les résultats' : 'Toutes les épreuves'],
                  ].map(([id, label]) => (
                    <button key={id} aria-pressed={mainTab === id} onClick={() => navigate(id)}>
                      {label}
                    </button>
                  ))}
                </nav>
              )}
              {mainTab === 'hub' && (
                <MySpace
                  user={user}
                  onNavigate={navigate}
                  others={otherSections(navTabs)}
                  actions={[
                    ['Personnaliser la barre du bas', () => setNavEditor(true)],
                    ...(user.isAdmin ? [['Administration', () => navigate('admin')]] : []),
                    ['Revoir le tutoriel', () => setTutorialRequest((v) => v + 1)],
                    ['Signaler un problème', () => setSupportOpen(true)],
                    [
                      reducedData() ? 'Quitter le mode connexion faible' : 'Mode connexion faible',
                      () => (reducedData() ? setDataMode('auto') : setDataMode('on')),
                    ],
                    [REFONTE ? 'Revenir à l’ancien design' : 'Essayer le nouveau design', () => setRefonte(!REFONTE)],
                    ['Revenir temporairement à l’ancienne navigation', () => runNavigation(() => setNav2(false))],
                    ['Déconnexion', () => runNavigation(handleLogout), 'danger'],
                  ]}
                />
              )}
              {NAV2 && ['mine', 'season', 'me', 'community', 'account'].includes(mainTab) && (
                <HubTrail tab={mainTab} onNavigate={navigate} />
              )}
              {!NAV2 && ['mine', 'season'].includes(mainTab) && (
                <nav className="secondary-nav hub-nav" aria-label="Mes pronos">
                  {[
                    ['mine', 'Mes pronostics'],
                    ['season', 'Ma saison'],
                  ].map(([id, label]) => (
                    <button key={id} aria-pressed={mainTab === id} onClick={() => navigate(id)}>
                      {label}
                    </button>
                  ))}
                </nav>
              )}
              {mainTab === 'season' && <MySeason userId={user.id} playerName={user.name || user.username} />}
              {mainTab === 'results' && <Results />}
              {mainTab === 'account' && (
                <>
                  <InstallApp />
                  <NotificationSettings key={user.id} userId={user.id} />
                  <DataModeSettings />
                </>
              )}
              {mainTab === 'account' && (
                <AccountSettings
                  user={user}
                  onPublicListingSaved={(publicListing) => setUser((current) => ({ ...current, publicListing }))}
                  onDeleted={() => {
                    consultationCache.clear();
                    verifiedUser.current = null;
                    localStorage.removeItem('token');
                    setUser(null);
                    setMainTab('play');
                    setError('Votre compte et vos données ont été supprimés.');
                  }}
                />
              )}
              {inviteNotice && mainTab === 'community' && (
                <p role="status" className="invite-notice">
                  <span>{inviteNotice}</span>
                  <button type="button" className="button-secondary" onClick={() => setInviteNotice('')}>
                    OK
                  </button>
                </p>
              )}
              {NAV2 && mainTab === 'play' && !selectedCompetitionId && !parseLocation(location.pathname).eventId && (
                <EventCards onOpen={openEvent} />
              )}
              {!['me', 'season', 'account', 'mine', 'results', 'leaderboard', 'community', 'hub'].includes(mainTab) &&
                !(REFONTE && mainTab === 'home') &&
                !(mainTab === 'admin' && adminSection !== 'event') && (
                  <EventSelector
                    hideCompact={mainTab === 'home'}
                    status={
                      ['play', 'live'].includes(mainTab) && selectedCompetitionId ? (
                        <ResultFreshness competitionId={selectedCompetitionId}>
                          {user.isAdmin && mainTab === 'play' && (
                            <Suspense fallback={adminFallback}>
                              <FtlControl
                                key={`ftl-${selectedCompetitionId}`}
                                competitionId={selectedCompetitionId}
                                onRefresh={() => {
                                  setResultsVersion((v) => v + 1);
                                  return fetchMatches(selectedCompetitionId);
                                }}
                              />
                            </Suspense>
                          )}
                        </ResultFreshness>
                      ) : null
                    }
                    actions={
                      mainTab === 'play' ? (
                        <button className="button-link" onClick={() => navigate('live')}>
                          Direct
                        </button>
                      ) : mainTab === 'live' ? (
                        <button className="button-link" onClick={() => navigate('play')}>
                          Pronostiquer
                        </button>
                      ) : null
                    }
                    key={`${user.id}:${eventListVersion}:${['play', 'home', 'live'].includes(mainTab) ? 'active' : 'history'}`}
                    includeArchived={!['play', 'home', 'live'].includes(mainTab)}
                    {...(NAV2 && mainTab === 'live'
                      ? {
                          title: 'Quelle épreuve suivre ?',
                          intro: 'Choisissez l’épreuve à suivre en direct ou à revoir.',
                          submitLabel: 'Suivre',
                        }
                      : NAV2 && mainTab === 'play'
                        ? {
                            title: 'Ou choisissez dans la liste',
                            intro: 'Toutes les épreuves ouvertes, par compétition.',
                          }
                        : {})}
                    {...(mainTab === 'admin'
                      ? {
                          title: 'Épreuve à administrer',
                          intro: 'Choisissez l’épreuve dont vous voulez gérer les matchs, les poules et les résultats.',
                          submitLabel: 'Ouvrir',
                        }
                      : {})}
                    userId={user.id}
                    beforeChange={runNavigation}
                    onReset={() => {
                      setTournamentId(null);
                      setTournamentInfo(null);
                      selectCompetition(null);
                      setCompetition(null);
                    }}
                    onSelect={(tId, cId, entry, tournament) => {
                      setTournamentId(tId);
                      setTournamentInfo(tournament ? { id: tId, name: tournament.name } : { id: tId, name: '' });
                      if (cId !== selectedCompetitionId) {
                        const loc = parseLocation(location.pathname, location.search);
                        const view = loc.eventId === cId ? loc.view : null;
                        selectCompetition(cId);
                        setPlayTab(view || 'tableau');
                        // Vue demandée par l'adresse : elle prime sur l'ouverture automatique.
                        if (view) setLandingPending(false);
                      }
                      setCompetition(entry);
                      setMainTab((current) =>
                        current !== 'play'
                          ? current
                          : new URLSearchParams(location.search).get('view') === 'mine'
                            ? 'mine'
                            : 'play',
                      );
                    }}
                  />
                )}
              {mainTab === 'live' && (
                <>
                  <nav className="secondary-nav play-tabs" aria-label="Suivi de l’épreuve">
                    {[
                      ['matches', 'Rencontres'],
                      ...(!team ? [['pools', 'Poules']] : []),
                      ['tableau', 'Tableau'],
                      ['ranking', 'Classement'],
                    ].map(([id, label]) => (
                      <button key={id} aria-pressed={liveView === id} onClick={() => setLiveView(id)}>
                        {label}
                      </button>
                    ))}
                  </nav>
                  {competition && liveView !== 'ranking' && <StandingsAccess onOpen={openEventStandings} />}
                  {liveView === 'matches' ? (
                    <PisteLive
                      key={`${selectedCompetitionId}:${liveMatchId}`}
                      initialMatchId={liveMatchId}
                      embedded
                      showLiveOverview
                      matches={matches}
                      competition={competition}
                      userId={user.id}
                      ready={matchesReady}
                      error={matchesError}
                      stale={matchesStale}
                      onPlay={(match) =>
                        match
                          ? openFollowedFencer({
                              event: competition,
                              match,
                              mode: 'predictions',
                              tournament: tournamentInfo,
                            })
                          : navigate('play')
                      }
                      onFollow={(match) =>
                        openFollowedFencer({ event: competition, match, mode: 'follow', tournament: tournamentInfo })
                      }
                    />
                  ) : (
                    competition && (
                      <CompetitionFollow
                        key={`${selectedCompetitionId}:${liveMatchId}`}
                        initialMatchId={liveMatchId}
                        view={liveView}
                        competition={{ ...competition, tableauByes }}
                        matches={matches}
                        userId={user.id}
                        ready={matchesReady}
                        error={matchesError}
                        stale={matchesStale}
                      />
                    )
                  )}
                </>
              )}
              {/* Classement général consultable sans choisir d'épreuve. */}
              {/* Communauté : tous les groupes, sans choisir d'épreuve au préalable. */}
              {mainTab === 'community' && (
                <Community
                  hideClubRanking={NAV2}
                  tournamentId={tournamentId}
                  userId={user.id}
                  onPronosticate={(league) =>
                    runNavigation(() => {
                      const scope = league.members?.[0]?.predictionScope || 'ALL';
                      setDelegationContext({ id: league.id, name: league.name, scope });
                      setPlayTab(predictionTabs(scope)[0][0]);
                      setMainTab('play');
                    })
                  }
                />
              )}
              {mainTab === 'leaderboard' && NAV2 && (
                <nav className="secondary-nav hub-nav" aria-label="Type de classement">
                  {[
                    ['players', 'Joueurs'],
                    ['clubs', 'Clubs'],
                  ].map(([id, label]) => (
                    <button key={id} aria-pressed={rankingView === id} onClick={() => setRankingView(id)}>
                      {label}
                    </button>
                  ))}
                  <button onClick={() => navigate('community')}>Mes délégations →</button>
                </nav>
              )}
              {mainTab === 'leaderboard' && (!NAV2 || rankingView === 'players') && (
                <GlobalLeaderboard userId={user.id} tournamentId={tournamentId} competitionId={selectedCompetitionId} />
              )}
              {mainTab === 'leaderboard' && NAV2 && rankingView === 'clubs' && <ClubRanking preferred={tournamentId} />}
              {mainTab === 'mine' && (
                <MyPredictions
                  userId={user.id}
                  playerName={user.name || user.username}
                  initialCompetitionId={
                    new URLSearchParams(location.search).get('view') === 'mine'
                      ? Number(new URLSearchParams(location.search).get('event')) || null
                      : null
                  }
                  onNavigate={(tab, id, target) => {
                    const wanted = tab === 'pools' ? 'pools' : id === 'podium' ? 'podium' : 'tableau';
                    // Autre épreuve que celle de « Pronostiquer » : on l'ouvre via le lien direct habituel.
                    if (target && target.competitionId !== selectedCompetitionId)
                      history.replaceState(
                        null,
                        '',
                        `/pronostiquer/${target.tournamentId}/${target.competitionId}${wanted === 'pools' ? '/poules' : ''}`,
                      );
                    setMainTab('play');
                    setPlayTab(wanted);
                    let attempts = 0;
                    const reveal = () => {
                      const target = document.getElementById(id);
                      if (!target && attempts++ < 40) {
                        setPlayTab(wanted);
                        setTimeout(reveal, 250);
                        return;
                      }
                      const detail = target?.closest('details');
                      if (detail) detail.open = true;
                      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    };
                    setTimeout(reveal, 0);
                  }}
                />
              )}
              {selectedCompetitionId && (
                <>
                  {mainTab === 'play' && (
                    <>
                      <h1 className="visually-hidden">Pronostiquer</h1>
                      <StandingsAccess onOpen={openEventStandings} />
                      {competition?.podiumFormat === 'TEAM' && (
                        <TeamFollows key={selectedCompetitionId} competitionId={selectedCompetitionId} />
                      )}
                      <ClosingCountdown
                        matches={matches}
                        userId={user.id}
                        onSelectMatch={(id) =>
                          runNavigation(() => {
                            setPlayTab('tableau');
                            setMatchTarget({ id, at: Date.now() });
                          })
                        }
                      />
                      {delegationContext && (
                        <p className="delegation-context">
                          {delegationContext.name} · {scopeLabels[delegationContext.scope]}{' '}
                          <button
                            className="button-link"
                            onClick={() => runNavigation(() => setDelegationContext(null))}
                          >
                            Afficher tous mes pronostics
                          </button>
                        </p>
                      )}
                      <nav className="secondary-nav play-tabs" aria-label="Type de pronostic">
                        {predictionTabs(delegationContext?.scope, team).map(([id, label]) => (
                          <button
                            key={id}
                            aria-pressed={playTab === id}
                            onClick={() =>
                              runNavigation(() => {
                                setDirty(false);
                                setPlayTab(id);
                              })
                            }
                          >
                            {label}
                            {boostedTab(competition?.pointsBoosts, id) && (
                              <span className="boost-tab-dot" aria-label=" (points ×2)">
                                🔥
                              </span>
                            )}
                          </button>
                        ))}
                      </nav>
                      <BoostBanner compact boosts={competition?.pointsBoosts} />
                      {playTab === 'podium' && (
                        <PodiumPrediction
                          key={selectedCompetitionId}
                          tournamentId={tournamentId}
                          selectedCompetitionId={selectedCompetitionId}
                          user={{ ...user, isAdmin: false }}
                          onDirtyChange={setDirty}
                        />
                      )}
                      {playTab === 'pools' && (
                        <PoolPredictions
                          refreshVersion={resultsVersion}
                          key={selectedCompetitionId}
                          tournamentId={tournamentId}
                          selectedCompetitionId={selectedCompetitionId}
                          user={{ ...user, isAdmin: false }}
                          onDirtyChange={setDirty}
                        />
                      )}
                      {playTab === 'tableau' && !matchesReady && (
                        <div className="load-state" role={matchesError ? 'alert' : 'status'}>
                          {matchesError ? (
                            <>
                              {matchesError}{' '}
                              <button
                                onClick={() => {
                                  setMatchesError('');
                                  setMatchesAttempt((n) => n + 1);
                                }}
                              >
                                Réessayer
                              </button>
                            </>
                          ) : (
                            'Chargement des matchs…'
                          )}
                        </div>
                      )}
                      {playTab === 'tableau' && matchesReady && !landingPending && (
                        <>
                          <MatchBoard
                            initialFilter={landingFilter}
                            focusTarget={matchTarget}
                            competitionId={selectedCompetitionId}
                            key={selectedCompetitionId}
                            matches={matches}
                            byes={tableauByes}
                            userId={user.id}
                            isAdmin={!!user.isAdmin}
                            ready={matchesReady}
                            stale={matchesStale}
                            onRefresh={(options) => fetchMatches(selectedCompetitionId, options)}
                            onOpenLive={(id) => {
                              setLiveView('matches');
                              setLiveMatchId(id);
                              navigate('live');
                            }}
                            onDirtyChange={setDirty}
                          />
                        </>
                      )}
                    </>
                  )}
                  {mainTab === 'admin' && user.isAdmin && adminSection === 'event' && (
                    <Suspense fallback={adminFallback}>
                      <AdminPanel
                        key={selectedCompetitionId}
                        competitionId={selectedCompetitionId}
                        tournamentId={tournamentId}
                        user={user}
                        matches={matches}
                        onRefresh={() => fetchMatches(selectedCompetitionId)}
                      />
                    </Suspense>
                  )}
                </>
              )}
              {mainTab === 'play' && (
                <details className="calendar-fold">
                  <summary>Calendrier des prochaines épreuves</summary>
                  <UpcomingCalendar
                    limit={8}
                    title="Prochaines épreuves"
                    headingLevel={3}
                    footer={
                      <p className="calendar-all">
                        <a href="/calendrier">Tout le calendrier →</a>
                      </p>
                    }
                  />
                </details>
              )}
            </Suspense>
          </ErrorBoundary>
          <footer className="site-footer">
            Pronos Escrime · Les résultats sont actualisés après import officiel. · <LegalLinks />
          </footer>
          {pendingNavigation && (
            <div className="navigation-overlay">
              <section role="dialog" aria-modal="true" aria-labelledby="unsaved-title" className="navigation-dialog">
                <h2 id="unsaved-title">Des pronostics ne sont pas enregistrés</h2>
                <p>Voulez-vous continuer votre saisie ou quitter sans enregistrer ?</p>
                <button autoFocus onClick={() => setPendingNavigation(null)}>
                  Continuer ma saisie
                </button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    const action = pendingNavigation;
                    setPendingNavigation(null);
                    setDirty(false);
                    action();
                  }}
                >
                  Quitter sans enregistrer
                </button>
              </section>
            </div>
          )}
        </div>
      </FencerFollowsProvider>
    );
  }

  // Refonte : la nouvelle page d'entrée accueille les visiteurs (connexion et inscription inchangées).
  if (REFONTE && !isAuthPath(location.pathname) && !invitation)
    return (
      <Suspense fallback={<p style={{ textAlign: 'center', marginTop: '100px' }}>Chargement…</p>}>
        <RedesignHome />
        <RefonteToggle />
      </Suspense>
    );
  return (
    <>
      <RefonteToggle />
      <Landing invitation={invitation} onInvitationInvalid={() => setInvitation(null)}>
        <div className="auth-card">
          {forgotPassword ? (
            <ForgotPassword onBack={() => setForgotPassword(false)} />
          ) : (
            <>
              <h2>{isRegister ? 'Inscription' : 'Connexion'}</h2>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {isRegister && (
                  <input
                    type="text"
                    aria-label="Nom d'utilisateur"
                    autoComplete="nickname"
                    placeholder="Nom d'utilisateur"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                )}
                <input
                  type={isRegister ? 'email' : 'text'}
                  aria-label={isRegister ? 'Adresse e-mail' : 'Identifiant ou adresse e-mail'}
                  autoComplete={isRegister ? 'email' : 'username'}
                  autoCapitalize="none"
                  placeholder={isRegister ? 'Email' : 'Identifiant ou e-mail'}
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <div className="password-field">
                  <input
                    id="auth-password"
                    aria-label="Mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    placeholder="Mot de passe"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="button-secondary"
                    aria-controls="auth-password"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                {twoFactor && !isRegister && (
                  <input
                    aria-label="Code de vérification"
                    placeholder="Code à 6 chiffres de votre application"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9 ]{6,7}"
                    required
                    autoFocus
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                )}
                {isRegister && (
                  <ClubChoice
                    value={formData.clubChoice}
                    onChange={(clubChoice) => setFormData({ ...formData, clubChoice })}
                  />
                )}
                <button type="submit">{isRegister ? "S'inscrire" : 'Se connecter'}</button>
              </form>
              {!isRegister && passwordReset && (
                <p>
                  <button className="button-link" onClick={() => setForgotPassword(true)}>
                    Mot de passe oublié ?
                  </button>
                </p>
              )}
              <p style={{ marginTop: '15px' }}>
                {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
                <button
                  className="button-link"
                  onClick={() => {
                    location.assign(authPath(!isRegister, location.search));
                  }}
                  style={{ textDecoration: 'underline' }}
                >
                  {isRegister ? 'Se connecter' : "S'inscrire"}
                </button>
              </p>
            </>
          )}
          <p className="muted auth-legal">
            <LegalLinks />
          </p>
        </div>
      </Landing>
    </>
  );
}
