import { eventLanding } from './components/matchPresentation';
import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import API, { SESSION_EXPIRED_EVENT } from './api';
import { shouldRefresh } from './lib/session.js';
import ScoringRules from './components/ScoringRules';
import EventSelector from './components/EventSelector';
import UpdateBanner from './components/UpdateBanner';
import { ForgotPassword, ResetPassword } from './components/AccountRecovery';
import { LegalPage, LegalLinks } from './components/LegalPages';
import { legalPageFor } from './lib/legal.js';
import ResultFreshness from './components/ResultFreshness';
import ClosingCountdown from './components/ClosingCountdown';
import InstallApp from './components/InstallApp';
import NotificationSettings from './components/NotificationSettings';
import { disableThisDevice } from './lib/notifications';
import MatchBoard from './components/MatchBoard';
import './interface.css';
import ErrorBoundary from './components/ErrorBoundary';
import { pollWhileVisible } from './lib/polling';
import { ClubContext, clubValue } from './lib/club';
// Outils d'administration chargés à la demande : les joueurs ne les téléchargent jamais.
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const FtlControl = lazy(() => import('./components/FtlControl'));
const CircuitSettings = lazy(() => import('./components/CircuitSettings'));
const ClubSettings = lazy(() => import('./components/ClubSettings'));
const SyncHealth = lazy(() => import('./components/SyncHealth'));
const FtlTournamentSetup = lazy(() => import('./components/FtlTournamentSetup'));
const adminFallback = <p className="muted">Chargement des outils d’administration…</p>;
// Onglets secondaires chargés à la première ouverture : l'écran des matchs s'affiche plus vite.
const PodiumPrediction = lazy(() => import('./components/PodiumPrediction'));
const PoolPredictions = lazy(() => import('./components/PoolPredictions'));
const GlobalLeaderboard = lazy(() => import('./components/GlobalLeaderboard'));
const MyPredictions = lazy(() => import('./components/MyPredictions'));
const ClubDay = lazy(() => import('./components/ClubDay'));
const MySeason = lazy(() => import('./components/MySeason'));
const AccountSettings = lazy(() => import('./components/AccountSettings'));
const Community = lazy(() => import('./components/Community'));
const tabFallback = <p className="muted load-state">Chargement…</p>;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [sessionRetry, setSessionRetry] = useState(0);
  const [isRegister, setIsRegister] = useState(false);
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
  const [mainTab, setMainTab] = useState('play');
  const [matchTarget, setMatchTarget] = useState(null);

  // Gestion des compétitions et tournoi actif
  const [tournamentId, setTournamentId] = useState(null);
  const [eventListVersion, setEventListVersion] = useState(0);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);

  const [matches, setMatches] = useState([]);
  const [resultsVersion, setResultsVersion] = useState(0);
  const [competition, setCompetition] = useState(null);
  const [playTab, setPlayTab] = useState('tableau');
  const [landingPending, setLandingPending] = useState(false);
  const [landingFilter, setLandingFilter] = useState('Tous');
  const [dirty, setDirty] = useState(false);
  const [matchesReady, setMatchesReady] = useState(false);
  const [matchesError, setMatchesError] = useState('');
  // Données déjà affichées mais dernier rafraîchissement raté (wifi de salle) : on prévient sans bloquer.
  const [matchesStale, setMatchesStale] = useState(false);
  const [matchesAttempt, setMatchesAttempt] = useState(0);
  const matchesLoaded = useRef(false);
  const [clubData, setClubData] = useState(null);
  const [clubVersion, setClubVersion] = useState(0);
  const club = useMemo(() => ({ ...clubValue(clubData), reload: () => setClubVersion((n) => n + 1) }), [clubData]);
  useEffect(() => {
    if (!user) return;
    const c = new AbortController();
    API.get('/community/club', { signal: c.signal })
      .then(({ data }) => setClubData(data))
      .catch(() => {});
    return () => c.abort();
  }, [user, clubVersion]);
  useEffect(() => {
    if (!landingPending || !matchesReady) return;
    const next = eventLanding(matches, user?.id, Date.now(), competition?.podiumFormat === 'TEAM');
    setPlayTab(next.tab);
    setLandingFilter(next.filter);
    setLandingPending(false);
  }, [landingPending, matchesReady, matches, user?.id, competition]);

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
        }
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
      setError('Votre session a expiré. Reconnectez-vous pour continuer.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
    setUser(null);
    setTournamentId(null);
    selectCompetition(null);
    setMainTab('play');
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

  if (legalPage) return <LegalPage page={legalPage} />;
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
      <ClubContext.Provider value={club}>
        <div className="app-shell redesigned">
          <header className="app-header">
            <div className="brand">
              <span className="brand-mark">↗</span>pronos<span>escrime</span>
            </div>
            <div className="account-actions">
              <span>{user.name || user.username}</span>
              {user.isAdmin && (
                <button className="button-secondary" onClick={() => navigate('admin')}>
                  Administration
                </button>
              )}
              <button
                className="button-link"
                aria-current={mainTab === 'account' ? 'page' : undefined}
                onClick={() => navigate('account')}
              >
                Mon compte
              </button>
              <button className="button-link" onClick={() => runNavigation(handleLogout)}>
                Déconnexion
              </button>
            </div>
          </header>
          <UpdateBanner onReload={runNavigation} />
          <nav className="primary-nav" aria-label="Navigation principale">
            {[
              ['play', '◎', 'Pronostiquer'],
              ['mine', '▤', 'Mes pronostics'],
              ['season', '◷', 'Ma saison'],
              ['leaderboard', '↗', 'Classements'],
              ['community', '♧', 'Communauté'],
            ].map(([id, icon, label]) => (
              <button key={id} aria-pressed={mainTab === id} onClick={() => navigate(id)}>
                <span aria-hidden="true">{icon}</span>
                {label}
              </button>
            ))}
          </nav>
          {error && <p role="alert">{error}</p>}
          <ErrorBoundary zone="contenu" resetKey={`${mainTab}:${playTab}:${selectedCompetitionId}`}>
            <Suspense fallback={tabFallback}>
              {mainTab === 'admin' && user.isAdmin && (
                <Suspense fallback={adminFallback}>
                  <SyncHealth />
                  <ClubSettings />
                  <CircuitSettings />
                  <FtlTournamentSetup onConfigured={() => setEventListVersion((v) => v + 1)} />
                </Suspense>
              )}
              {mainTab === 'season' && <MySeason userId={user.id} playerName={user.name || user.username} />}
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
              {!['season', 'account', 'mine'].includes(mainTab) && (
                <EventSelector
                  key={`${user.id}:${eventListVersion}:${mainTab === 'play' ? 'active' : 'history'}`}
                  includeArchived={mainTab !== 'play'}
                  userId={user.id}
                  beforeChange={runNavigation}
                  onReset={() => {
                    setTournamentId(null);
                    selectCompetition(null);
                    setCompetition(null);
                  }}
                  onSelect={(tId, cId, entry) => {
                    setTournamentId(tId);
                    selectCompetition(cId);
                    setCompetition(entry);
                    if (cId !== selectedCompetitionId)
                      setPlayTab(new URLSearchParams(location.search).get('view') === 'pools' ? 'pools' : 'tableau');
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
              {/* Classement général consultable sans choisir d'épreuve. */}
              {mainTab === 'leaderboard' && (
                <GlobalLeaderboard userId={user.id} tournamentId={tournamentId} competitionId={selectedCompetitionId} />
              )}
              {mainTab === 'mine' && (
                <MyPredictions
                  userId={user.id}
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
                        `${location.pathname}?tournament=${target.tournamentId}&event=${target.competitionId}${wanted === 'pools' ? '&view=pools' : ''}`,
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
                      <ResultFreshness key={selectedCompetitionId} competitionId={selectedCompetitionId}>
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
                      <nav className="secondary-nav" aria-label="Type de pronostic">
                        {[
                          ['podium', 'Podium'],
                          ...(!team ? [['pools', 'Poules']] : []),
                          ['tableau', 'Tableau'],
                          ...(club.hasFencers ? [['club', 'Nos tireurs']] : []),
                        ].map(([id, label]) => (
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
                        ))}
                      </nav>
                      {playTab === 'club' && club.hasFencers && (
                        <ClubDay
                          key={selectedCompetitionId}
                          competitionId={selectedCompetitionId}
                          matches={matches}
                          team={team}
                        />
                      )}
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
                          <ScoringRules type="matches" />
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
                  {mainTab === 'community' && (
                    <Community
                      key={selectedCompetitionId}
                      competitionId={selectedCompetitionId}
                      tournamentId={tournamentId}
                      userId={user.id}
                    />
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
      </ClubContext.Provider>
    );
  }

  return (
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
                setIsRegister(!isRegister);
                setShowPassword(false);
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
  );
}
