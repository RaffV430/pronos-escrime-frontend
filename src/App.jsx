import { useState, useEffect } from 'react';
import API from './api';
import ScoringRules from './components/ScoringRules';
import EventSelector from './components/EventSelector';
import PodiumPrediction from './components/PodiumPrediction';
import PoolPredictions from './components/PoolPredictions';
import GlobalLeaderboard from './components/GlobalLeaderboard';
import MyPredictions from './components/MyPredictions';
import Community from './components/Community';
import AdminPanel from './components/AdminPanel';
import FtlControl from './components/FtlControl';
import MatchBoard from './components/MatchBoard';
import './interface.css';

const SHOW_SHEET_SYNC = false;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [sessionRetry, setSessionRetry] = useState(0);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  
  // Navigation principale
  const [mainTab, setMainTab] = useState('play');

  // Gestion des compétitions et tournoi actif
  const [tournamentId, setTournamentId] = useState(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);

  const [matches, setMatches] = useState([]);
  const [competition, setCompetition] = useState(null);
  const [playTab, setPlayTab] = useState('tableau');
  const [dirty, setDirty] = useState(false);
  const [matchesReady, setMatchesReady] = useState(false);
  const [matchesError, setMatchesError] = useState('');
  const [pendingNavigation,setPendingNavigation]=useState(null);
  const runNavigation=(action)=>{if(dirty)setPendingNavigation(()=>action);else action();};
  const navigate = (tab) => runNavigation(()=>{setDirty(false);setMainTab(tab);});

  const [matchNow, setMatchNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setMatchNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  // 2. Charger les matchs en fonction de la compétition
  const fetchMatches = async (compId) => {
    if (!compId) return;
    try {
      const res = await API.get(`/matches?competitionId=${compId}`);
      setMatches(res.data); setMatchesReady(true); setMatchesError('');
    } catch (err) {
      console.error('Erreur chargement matchs :', err);
    }
  };

  useEffect(() => {
    if (!selectedCompetitionId) return;
    const controller = new AbortController();
    const refreshMatches = () => API.get(`/matches?competitionId=${selectedCompetitionId}`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) { setMatches(data); setMatchesReady(true); setMatchesError(''); } })
      .catch(() => { if (!controller.signal.aborted) setMatchesError('Impossible de vérifier les matchs. Réessayez.'); });
    refreshMatches();
    const timer = setInterval(refreshMatches, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selectedCompetitionId]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          if (![401,403,404].includes(err.response?.status)) { setSessionError(true); setLoading(false); return; }
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    setSessionError(false); setLoading(true); checkAuth();
  }, [sessionRetry]);

  const handleSyncSheet = async () => {
    if (!selectedCompetitionId) {
      setSyncMessage('❌ Veuillez sélectionner une compétition.');
      return;
    }
    
    setIsSyncing(true);
    setSyncMessage('Synchronisation en cours...');
    try {
      const res = await API.post('/matches/sync-sheet', { competitionId: selectedCompetitionId });
      setSyncMessage(`✅ Succès : ${res.data.details?.count || 0} matchs mis à jour !`);
      fetchMatches(selectedCompetitionId);
    } catch (err) {
      setSyncMessage(`❌ ${err.response?.data?.error || 'Erreur lors de la synchronisation.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const res = await API.post(endpoint, formData);
      const token = res.data.token;
      
      localStorage.setItem('token', token);
      setUser(res.data.user);
      if (selectedCompetitionId) fetchMatches(selectedCompetitionId);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Une erreur est survenue';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setTournamentId(null);
    selectCompetition(null);
    setMainTab('play');
  };

  const selectCompetition = (competitionId) => {
    setMatches([]);
    setDirty(false); setMatchesReady(false); setMatchesError('');
    setSyncMessage('');
    setSelectedCompetitionId(competitionId);
  };

  if (sessionError) return <main className="auth-card"><h2>Connexion temporairement indisponible</h2><p>Votre session est conservée. Vérifiez votre connexion puis réessayez.</p><button onClick={() => setSessionRetry(n=>n+1)}>Réessayer</button></main>;
  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px' }}>Chargement de la session...</div>;
  }

  if (user) {
    const team=competition?.podiumFormat==='TEAM';
    return <div className="app-shell redesigned">
      <header className="app-header"><div className="brand"><span className="brand-mark">↗</span>pronos<span>escrime</span></div><div className="account-actions"><span>{user.name||user.username}</span>{user.isAdmin&&<button className="button-secondary" onClick={()=>navigate('admin')}>Administration</button>}<button className="button-link" onClick={()=>runNavigation(handleLogout)}>Déconnexion</button></div></header>
      <nav className="primary-nav" aria-label="Navigation principale">{[['play','◎','Pronostiquer'],['mine','▤','Mes pronostics'],['leaderboard','↗','Classements'],['community','♧','Communauté']].map(([id,icon,label])=><button key={id} aria-pressed={mainTab===id} onClick={()=>navigate(id)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>
      <EventSelector key={user.id} userId={user.id} beforeChange={runNavigation} onReset={()=>{setTournamentId(null);selectCompetition(null);setCompetition(null);}} onSelect={(tId,cId,entry)=>{setTournamentId(tId);selectCompetition(cId);setCompetition(entry);setPlayTab(entry?.podiumFormat==='TEAM'?'tableau':'pools');setMainTab('play');}}/>
      {selectedCompetitionId&&<>
        {mainTab==='play'&&<><div className="page-heading"><p className="eyebrow">À VOUS DE JOUER</p><h1>Faites la différence.</h1><p>Vos favoris, vos scores, votre compétition.</p></div>{user.isAdmin&&<FtlControl key={`ftl-${selectedCompetitionId}`} competitionId={selectedCompetitionId} onRefresh={()=>fetchMatches(selectedCompetitionId)}/>}<nav className="secondary-nav" aria-label="Type de pronostic">{[['podium','Podium'],...(!team?[['pools','Poules']]:[]),['tableau','Tableau']].map(([id,label])=><button key={id} aria-pressed={playTab===id} onClick={()=>runNavigation(()=>{setDirty(false);setPlayTab(id);})}>{label}</button>)}</nav>
        {playTab==='podium'&&<PodiumPrediction key={selectedCompetitionId} tournamentId={tournamentId} selectedCompetitionId={selectedCompetitionId} user={{...user,isAdmin:false}} onDirtyChange={setDirty}/>}
        {playTab==='pools'&&<PoolPredictions key={selectedCompetitionId} tournamentId={tournamentId} selectedCompetitionId={selectedCompetitionId} user={{...user,isAdmin:false}} onDirtyChange={setDirty}/>}
        {playTab==='tableau'&&<><ScoringRules type="matches"/><MatchBoard key={selectedCompetitionId} matches={matches} userId={user.id} now={matchNow} ready={matchesReady} error={matchesError} onRefresh={()=>fetchMatches(selectedCompetitionId)} onDirtyChange={setDirty}/></>}
        {user.isAdmin&&SHOW_SHEET_SYNC&&<div><button disabled={isSyncing} onClick={handleSyncSheet}>Synchroniser Google Sheets</button><p>{syncMessage}</p></div>}
        </>}
        {mainTab==='mine'&&<MyPredictions key={selectedCompetitionId} competitionId={selectedCompetitionId} tournamentId={tournamentId} userId={user.id} onNavigate={(tab,id)=>{setMainTab('play');setPlayTab(tab==='pools'?'pools':id==='podium'?'podium':'tableau');let attempts=0;const reveal=()=>{const target=document.getElementById(id);if(!target&&attempts++<40){setTimeout(reveal,250);return;}const detail=target?.closest('details');if(detail)detail.open=true;target?.scrollIntoView({behavior:'smooth',block:'center'});};setTimeout(reveal,0);}}/>}
        {mainTab==='community'&&<Community key={selectedCompetitionId} competitionId={selectedCompetitionId} tournamentId={tournamentId} userId={user.id}/>}
        {mainTab==='leaderboard'&&<GlobalLeaderboard userId={user.id} tournamentId={tournamentId} competitionId={selectedCompetitionId}/>}
        {mainTab==='admin'&&user.isAdmin&&<AdminPanel key={selectedCompetitionId} competitionId={selectedCompetitionId} tournamentId={tournamentId} user={user} matches={matches} now={matchNow} onRefresh={()=>fetchMatches(selectedCompetitionId)}/>}
      </>}<footer className="site-footer">Pronos Escrime · Les résultats sont actualisés après import officiel.</footer>{pendingNavigation&&<div className="navigation-overlay"><section role="dialog" aria-modal="true" aria-labelledby="unsaved-title" className="navigation-dialog"><h2 id="unsaved-title">Des pronostics ne sont pas enregistrés</h2><p>Voulez-vous continuer votre saisie ou quitter sans enregistrer ?</p><button autoFocus onClick={()=>setPendingNavigation(null)}>Continuer ma saisie</button><button className="button-secondary" onClick={()=>{const action=pendingNavigation;setPendingNavigation(null);setDirty(false);action();}}>Quitter sans enregistrer</button></section></div>}
    </div>;
  }

  return (
    <div className="auth-card">
      <h2>{isRegister ? 'Inscription' : 'Connexion'}</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isRegister && <input type="text" placeholder="Nom d'utilisateur" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}  />}
        <input type="text" placeholder={isRegister ? "Email" : "Identifiant"} required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}  />
        <div className="password-field">
          <input id="auth-password" aria-label="Mot de passe" type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="Mot de passe" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          <button type="button" className="button-secondary" aria-controls="auth-password" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword(visible => !visible)}>{showPassword ? 'Masquer' : 'Afficher'}</button>
        </div>
        <button type="submit" >{isRegister ? "S'inscrire" : 'Se connecter'}</button>
      </form>
      <p style={{ marginTop: '15px' }}>
        {isRegister ? 'Déjà un compte ?' : "Pas encore de compte ?"} {' '}
        <button className="button-link" onClick={() => { setIsRegister(!isRegister); setShowPassword(false); }} style={{ textDecoration: 'underline' }}>{isRegister ? 'Se connecter' : "S'inscrire"}</button>
      </p>
    </div>
  );
}
