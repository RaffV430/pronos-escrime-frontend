import AdminAlerts from './components/AdminAlerts';
import { adminDestination, adminLoginPath, loginReturn, updateBadge } from './lib/adminDestination';
import ClubModeration from './components/ClubModeration';
import AppTutorial from './components/AppTutorial';
import ClubChoice from './components/ClubChoice';
import ClubProfile from './components/ClubProfile';
import ClubAdministration from './components/ClubAdministration';
import FencerAffiliationAdministration from './components/FencerAffiliationAdministration';
import { FollowedEventFencers, CompetitionFollow } from './components/EventWorkspace';
import { FencerFollowsProvider } from './components/FencerFollowsProvider';
import { isAuthPath, authPath } from './lib/authNavigation';
import { ArenaHome, PisteFencers } from './components/PisteExperience';
import PisteLive from './components/PisteLive';
import { eventLanding } from './components/matchPresentation';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import API, { SESSION_EXPIRED_EVENT } from './api';
import { shouldRefresh } from './lib/session.js';
import EventSelector from './components/EventSelector';
import UpdateBanner from './components/UpdateBanner';
import NotificationBanner from './components/NotificationBanner';
import { ForgotPassword, ResetPassword } from './components/AccountRecovery';
import { LegalPage, LegalLinks } from './components/LegalPages';
import { legalPageFor } from './lib/legal.js';
import { TAB_TITLES, idOf, parseLocation, pathFor, pathForTab, tabFromPath } from './lib/routes.js';
import { captureInvitation, clearInvitation } from './lib/invitation.js';
import ResultFreshness from './components/ResultFreshness';
import ClosingCountdown from './components/ClosingCountdown';
import InstallApp from './components/InstallApp';
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
const FtlTournamentSetup = lazy(() => import('./components/FtlTournamentSetup'));
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
const AccountSettings = lazy(() => import('./components/AccountSettings'));
const Community = lazy(() => import('./components/Community'));
const tabFallback = <p className="muted load-state">Chargement…</p>;

export default function App() {
  // Lien d'invitation (/rejoindre/<code>) : lu avant tout le reste, l'adresse redevient « / ».
  const [tutorialRequest, setTutorialRequest] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
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
  const [arenaMore, setArenaMore] = useState(false);
  const [invitation, setInvitation] = useState(() => captureInvitation());
  const [inviteNotice, setInviteNotice] = useState('');
  const joining = useRef(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const [mainTab, setMainTab] = useState(
    () =>
      (loginReturn(location.search)
        ? 'admin'
        : (location.pathname === '/' || isAuthPath(location.pathname)) &&
            /[?&](event|tournament|match|matches|view)=/.test(location.search)
          ? 'play'
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
  const [matchTarget, setMatchTarget] = useState(null);

  // Gestion des compétitions et tournoi actif
  const [tournamentId, setTournamentId] = useState(null);
  const [eventListVersion, setEventListVersion] = useState(0);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [tournamentInfo, setTournamentInfo] = useState(null);
  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current = selectedCompetitionId;
  }, [selectedCompetitionId]);

  const [matches, setMatches] = useState([]);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [competition, setCompetition] = useState(null);
  const [playTab, setPlayTab] = useState('tableau');
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
  const [eventMode, setEventMode] = useState('predictions');
  const [followView, setFollowView] = useState('tableau');
  const [followMatchId, setFollowMatchId] = useState(null);
  const [liveMatchId, setLiveMatchId] = useState(null);
  const [landingPending, setLandingPending] = useState(false);
  const [landingFilter, setLandingFilter] = useState('Tous');
  const [dirty, setDirty] = useState(false);
  const [matchesReady, setMatchesReady] = useState(false);
  const [matchesError, setMatchesError] = useState('');
  // Données déjà affichées mais dernier rafraîchissement raté (wifi de salle) : on prévient sans bloquer.
  const [matchesStale, setMatchesStale] = useState(false);
  const [matchesAttempt, setMatchesAttempt] = useState(0);
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

  const openAdminAlert = (panel) =>
    runNavigation(() => {
      history.pushState(null, '', `/admin?panel=${panel}`);
      setAdminTarget({ panel, requestId: null });
      setMainTab('admin');
    });

  // 2. Charger les matchs en fonction de la compétition
  const fetchMatches = async (compId) => {
    if (!compId) return;
    try {
      const res = await API.get(`/matches?competitionId=${compId}`);
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
    const stopPolling = pollWhileVisible(refreshMatches, 30000);
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
          setUser(res.data);
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
    const expired = () => {
      setUser(null);
      const next = adminLoginPath(location.pathname, location.search);
      if (next) history.replaceState(null, '', next);
      setError('Votre session a expiré. Reconnectez-vous pour continuer.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
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

      localStorage.setItem('token', token);
      setUser(res.data.user);
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

  const openFollowedFencer = ({ event, match, mode, tournament }) =>
    runNavigation(() => {
      setDirty(false);
      selectCompetition(event.id);
      setCompetition(event);
      setLandingPending(false);
      setEventListVersion((v) => v + 1);
      setEventMode(mode);
      setPlayTab('tableau');
      setFollowView(match ? 'tableau' : 'pools');
      setFollowMatchId(match?.id || null);
      if (mode === 'predictions') setMatchTarget({ id: match.id, at: Date.now() });
      history.replaceState(
        null,
        '',
        pathFor('play', { tournament: tournament || tournamentInfo, event, view: 'tableau' }),
      );
      setMainTab('play');
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
          <header className="app-header">
            <div className="brand">
              <BrandMark />
              pronos<span>escrime</span>
            </div>
            <div className="account-actions">
              <AdminAlerts user={user} onOpen={openAdminAlert} />
              <button className="button-secondary" onClick={() => navigate('results')}>
                Résultats
              </button>
              <button className="button-link" onClick={() => navigate('account')}>
                Mon compte
              </button>
              <div
                className="user-menu"
                ref={accountMenu}
                onMouseEnter={() => {
                  if (matchMedia('(hover: hover)').matches) setAccountOpen(true);
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
                    if (e.detail > 0 && matchMedia('(hover: hover)').matches) setAccountOpen(true);
                    else setAccountOpen((v) => !v);
                  }}
                >
                  {user.name || user.username} ⌄
                </button>
                {accountOpen && (
                  <nav id="user-options" className="user-menu-panel" aria-label="Mon espace">
                    {[
                      ['live', 'Suivi des pistes'],
                      ['mine', 'Mes pronostics'],
                      ['season', 'Ma saison'],
                      ['account', 'Mes réglages'],
                      ...(user.isAdmin ? [['admin', 'Administration']] : []),
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => {
                          setAccountOpen(false);
                          navigate(id);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        setTutorialRequest((v) => v + 1);
                      }}
                    >
                      Tutoriel d’utilisation
                    </button>
                    <button
                      className="user-menu-logout"
                      onClick={() => {
                        setAccountOpen(false);
                        runNavigation(handleLogout);
                      }}
                    >
                      Déconnexion
                    </button>
                  </nav>
                )}
              </div>
            </div>
          </header>
          <AppTutorial
            key={user.id}
            userId={user.id}
            skipAutomatic={Boolean(adminTarget)}
            request={tutorialRequest}
            onNavigate={(step) =>
              runNavigation(() => {
                setMainTab(step.tab);
                if (step.view) {
                  setEventMode('predictions');
                  setPlayTab(step.view);
                  setLandingPending(false);
                }
              })
            }
          />
          <UpdateBanner onReload={runNavigation} />
          <NotificationBanner userId={user.id} />
          <nav className="primary-nav" aria-label="Navigation principale">
            {[
              ['home', '⌂', 'Accueil'],
              ['play', '◎', 'Pronostiquer'],
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
              ['community', '⚑', 'Délégations'],
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
            ].map(([id, icon, label]) => (
              <button
                key={id}
                data-tab={id}
                aria-pressed={mainTab === id || (id === 'home' && mainTab === 'live')}
                onClick={() => {
                  setArenaMore(false);
                  navigate(id);
                }}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </button>
            ))}
            {
              <button className="arena-more" aria-expanded={arenaMore} onClick={() => setArenaMore(!arenaMore)}>
                <span aria-hidden="true">⋯</span>Plus
              </button>
            }
            {accountClub?.name && (
              <div className="arena-club">
                <span>VOTRE CLUB</span>
                <strong>{accountClub.name}</strong>
                <button onClick={() => navigate('community')}>Retrouver la délégation →</button>
              </div>
            )}
          </nav>
          {arenaMore && (
            <nav className="arena-mobile-menu" aria-label="Autres sections">
              {[
                ['mine', 'Mes pronostics'],
                ['season', 'Ma saison'],
                ['results', 'Résultats'],
                ['account', 'Mon compte'],
                ...(user.isAdmin ? [['admin', 'Administration']] : []),
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setArenaMore(false);
                    navigate(id);
                  }}
                >
                  {label} →
                </button>
              ))}
              <button onClick={() => setArenaMore(false)}>Fermer</button>
            </nav>
          )}
          {error && <p role="alert">{error}</p>}
          <ErrorBoundary zone="contenu" resetKey={`${mainTab}:${playTab}:${selectedCompetitionId}`}>
            <Suspense fallback={tabFallback}>
              {mainTab === 'admin' && user.isAdmin && (
                <Suspense fallback={adminFallback}>
                  <SyncHealth destination={adminTarget} />
                  <CalendarWatch />
                  <ClubModeration destination={adminTarget} onSecurity={() => navigate('account')} />
                  <ClubAdministration />
                  <FencerAffiliationAdministration />
                  <CircuitSettings />
                  <FtlTournamentSetup onConfigured={() => setEventListVersion((v) => v + 1)} />
                </Suspense>
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
                </>
              )}
              {mainTab === 'live' && (
                <PisteLive
                  key={`${selectedCompetitionId}:${liveMatchId}`}
                  initialMatchId={liveMatchId}
                  matches={matches}
                  competition={competition}
                  userId={user.id}
                  ready={matchesReady}
                  error={matchesError}
                  stale={matchesStale}
                  onPlay={() => navigate('play')}
                />
              )}
              {mainTab === 'season' && <MySeason userId={user.id} playerName={user.name || user.username} />}
              {mainTab === 'results' && <Results />}
              {mainTab === 'account' && (
                <>
                  <InstallApp />
                  <NotificationSettings key={user.id} userId={user.id} />
                </>
              )}
              {mainTab === 'account' && (
                <AccountSettings
                  user={user}
                  onDeleted={() => {
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
              {!['me', 'season', 'account', 'mine', 'results', 'leaderboard', 'community'].includes(mainTab) && (
                <EventSelector
                  hideCompact={mainTab === 'home'}
                  key={`${user.id}:${eventListVersion}:${['play', 'home', 'live'].includes(mainTab) ? 'active' : 'history'}`}
                  includeArchived={!['play', 'home', 'live'].includes(mainTab)}
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
              {/* Classement général consultable sans choisir d'épreuve. */}
              {/* Communauté : tous les groupes, sans choisir d'épreuve au préalable. */}
              {mainTab === 'community' && <Community tournamentId={tournamentId} userId={user.id} />}
              {mainTab === 'leaderboard' && (
                <GlobalLeaderboard userId={user.id} tournamentId={tournamentId} competitionId={selectedCompetitionId} />
              )}
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
                      <ResultFreshness competitionId={selectedCompetitionId}>
                        {user.isAdmin && (
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
                      <nav className="secondary-nav" aria-label="Espace de l’épreuve">
                        {[
                          ['predictions', 'Pronostics'],
                          ['follow', 'Suivi compétition'],
                          ['fencers', 'Mes tireurs'],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            aria-pressed={eventMode === id}
                            onClick={() => runNavigation(() => setEventMode(id))}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>
                      {eventMode === 'predictions' && (
                        <nav className="secondary-nav" aria-label="Type de pronostic">
                          {[...(!team ? [['pools', 'Poules']] : []), ['tableau', 'Tableau'], ['podium', 'Podium']].map(
                            ([id, label]) => (
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
                              </button>
                            ),
                          )}
                        </nav>
                      )}
                      {eventMode === 'follow' && (
                        <>
                          <nav className="secondary-nav" aria-label="Suivi officiel">
                            {[
                              ...(!team ? [['pools', 'Poules']] : []),
                              ['tableau', 'Tableau'],
                              ['ranking', 'Classement'],
                            ].map(([id, label]) => (
                              <button key={id} aria-pressed={followView === id} onClick={() => setFollowView(id)}>
                                {label}
                              </button>
                            ))}
                          </nav>
                          <CompetitionFollow
                            key={`${selectedCompetitionId}:${followMatchId}`}
                            initialMatchId={followMatchId}
                            view={followView}
                            competition={competition}
                            matches={matches}
                            userId={user.id}
                            ready={matchesReady}
                            error={matchesError}
                            stale={matchesStale}
                          />
                        </>
                      )}
                      {eventMode === 'fencers' && (
                        <FollowedEventFencers
                          userId={user.id}
                          competition={competition}
                          matches={matches}
                          onEventChange={(entry) =>
                            runNavigation(() => {
                              history.replaceState(
                                null,
                                '',
                                pathFor('play', { tournament: tournamentInfo, event: entry, view: playTab }),
                              );
                              selectCompetition(entry.id);
                              setCompetition(entry);
                              setLandingPending(false);
                              setEventListVersion((v) => v + 1);
                            })
                          }
                          onMatch={(id) => {
                            setEventMode('predictions');
                            setPlayTab('tableau');
                            setMatchTarget({ id, at: Date.now() });
                          }}
                          onLive={(id) => {
                            setLiveMatchId(id);
                            navigate('live');
                          }}
                        />
                      )}
                      {eventMode === 'predictions' && playTab === 'podium' && (
                        <PodiumPrediction
                          key={selectedCompetitionId}
                          tournamentId={tournamentId}
                          selectedCompetitionId={selectedCompetitionId}
                          user={{ ...user, isAdmin: false }}
                          onDirtyChange={setDirty}
                        />
                      )}
                      {eventMode === 'predictions' && playTab === 'pools' && (
                        <PoolPredictions
                          refreshVersion={resultsVersion}
                          key={selectedCompetitionId}
                          tournamentId={tournamentId}
                          selectedCompetitionId={selectedCompetitionId}
                          user={{ ...user, isAdmin: false }}
                          onDirtyChange={setDirty}
                        />
                      )}
                      {eventMode === 'predictions' && playTab === 'tableau' && !matchesReady && (
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
                      {eventMode === 'predictions' && playTab === 'tableau' && matchesReady && !landingPending && (
                        <>
                          <MatchBoard
                            initialFilter={landingFilter}
                            focusTarget={matchTarget}
                            competitionId={selectedCompetitionId}
                            key={selectedCompetitionId}
                            matches={matches}
                            userId={user.id}
                            isAdmin={!!user.isAdmin}
                            ready={matchesReady}
                            stale={matchesStale}
                            onRefresh={() => fetchMatches(selectedCompetitionId)}
                            onDirtyChange={setDirty}
                          />
                        </>
                      )}
                    </>
                  )}
                  {mainTab === 'admin' && user.isAdmin && (
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

  return (
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
  );
}
