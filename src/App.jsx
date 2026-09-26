import { useState, useEffect } from 'react';
import API from './api';
import ScoringRules from './components/ScoringRules';
import EventSelector from './components/EventSelector';
import PodiumPrediction from './components/PodiumPrediction';
import PoolPredictions from './components/PoolPredictions';
import GlobalLeaderboard from './components/GlobalLeaderboard';

const SHOW_SHEET_SYNC = false;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  
  // Navigation principale
  const [mainTab, setMainTab] = useState('pools');

  // Gestion des compétitions et tournoi actif
  const [tournamentId, setTournamentId] = useState(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);

  const [matches, setMatches] = useState([]);
  const [predictionInputs, setPredictionInputs] = useState({});
  const [submitMessages, setSubmitMessages] = useState({});

  // --- NOUVEAUX STATES POUR L'AJUSTEMENT MANUEL DES POINTS ---
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustBy, setAdjustBy] = useState('id');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustTournamentId, setAdjustTournamentId] = useState('');
  const [adjustCompetitionId, setAdjustCompetitionId] = useState('');
  const [adjustMessage, setAdjustMessage] = useState('');

  const [matchNow, setMatchNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setMatchNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  // 2. Charger les matchs en fonction de la compétition
  const fetchMatches = async (compId) => {
    if (!compId) return;
    try {
      const res = await API.get(`/matches?competitionId=${compId}`);
      setMatches(res.data);
    } catch (err) {
      console.error('Erreur chargement matchs :', err);
    }
  };

  useEffect(() => {
    if (!selectedCompetitionId) return;
    const controller = new AbortController();
    const refreshMatches = () => API.get(`/matches?competitionId=${selectedCompetitionId}`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setMatches(data); })
      .catch(err => { if (!controller.signal.aborted) console.error('Erreur chargement matchs :', err); });
    refreshMatches();
    const timer = setInterval(refreshMatches, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selectedCompetitionId]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await API.get('/auth/me');
          setUser(res.data);
        } catch {
          localStorage.removeItem('token');
          delete API.defaults.headers.common['Authorization'];
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

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
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(res.data.user);
      if (selectedCompetitionId) fetchMatches(selectedCompetitionId);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Une erreur est survenue';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete API.defaults.headers.common['Authorization'];
    setUser(null);
    setTournamentId(null);
    selectCompetition(null);
    setMainTab('pools');
  };

  const handleScoreChange = (matchId, playerNum, value) => {
    setPredictionInputs(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [`score${playerNum}`]: value }
    }));
  };

  const submitPrediction = async (matchId) => {
    const p = predictionInputs[matchId];
    if (!p || p.score1 === undefined || p.score2 === undefined || p.score1 === '' || p.score2 === '') {
      setSubmitMessages(prev => ({ ...prev, [matchId]: { type: 'error', text: 'Remplissez les 2 scores' }}));
      return;
    }

    try {
      await API.post(`/matches/${matchId}/predict`, {
        predictedScore1: parseInt(p.score1),
        predictedScore2: parseInt(p.score2)
      });
      setSubmitMessages(prev => ({ ...prev, [matchId]: { type: 'success', text: '✅ Enregistré !' }}));
      if (selectedCompetitionId) fetchMatches(selectedCompetitionId);
    } catch (err) {
      setSubmitMessages(prev => ({ ...prev, [matchId]: { type: 'error', text: err.response?.data?.error || '❌ Erreur' }}));
    }
  };

  const deletePrediction = async (matchId) => {
    try {
      await API.delete(`/matches/${matchId}/predict`);
      setPredictionInputs(prev => ({
        ...prev,
        [matchId]: { score1: '', score2: '' }
      }));
      setSubmitMessages(prev => ({ ...prev, [matchId]: { type: 'success', text: '🗑️ Supprimé !' }}));
      if (selectedCompetitionId) fetchMatches(selectedCompetitionId);
    } catch (err) {
      setSubmitMessages(prev => ({ ...prev, [matchId]: { type: 'error', text: err.response?.data?.error || '❌ Erreur' }}));
    }
  };

  // --- NOUVELLE FONCTION POUR L'AJUSTEMENT MANUEL ---
  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    setAdjustMessage('');

    if (!adjustUserId || !adjustPoints) {
      setAdjustMessage('⚠️ Veuillez sélectionner un joueur et un nombre de points.');
      return;
    }

    try {
      const res = await API.post('/admin/adjust-points', {
        ...(adjustBy === 'id' ? { userId: adjustUserId } : { name: adjustUserId }),
        points: adjustPoints,
        reason: adjustReason,
        tournamentId: adjustTournamentId,
        competitionId: adjustCompetitionId
      });
      
      if (res.data.success) {
        setAdjustMessage('✅ Points ajustés avec succès !');
        setAdjustPoints('');
        setAdjustReason('');
      }
    } catch (error) {
      console.error(error);
      setAdjustMessage("❌ Erreur lors de l'ajustement.");
    }
  };

  const handleKeyDown = (e, matchId, playerNum, index, activeMatches) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      if (playerNum === 1) {
        document.getElementById(`input-${matchId}-2`)?.focus();
      } 
      else if (playerNum === 2) {
        submitPrediction(matchId);
        const currentIndex = activeMatches.findIndex(m => m.id === matchId);
        if (currentIndex !== -1 && currentIndex + 1 < activeMatches.length) {
          const nextMatchId = activeMatches[currentIndex + 1].id;
          document.getElementById(`input-${nextMatchId}-1`)?.focus();
        }
      }
    }
  };

  const selectCompetition = (competitionId) => {
    setMatches([]);
    setPredictionInputs({});
    setSubmitMessages({});
    setSyncMessage('');
    setSelectedCompetitionId(competitionId);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px' }}>Chargement de la session...</div>;
  }

  if (user) {
    const validMatches = matches.filter(match => {
      const hasPlayer1 = match.player1 && match.player1.trim() !== '' && match.player1 !== "En attente...";
      const hasPlayer2 = match.player2 && match.player2.trim() !== '' && match.player2 !== "En attente...";
      return hasPlayer1 && hasPlayer2;
    });

    const finishedMatches = validMatches.filter(m => m.isFinished);
    const activeMatches = validMatches.filter(m => !m.isFinished);

    return (
      <div className="app-shell">
        
        {/* En-tête Global */}
        <header className="app-header">
          <h2>Bienvenue, {user.username || user.name || 'Utilisateur'} ! {user.isAdmin && '👑'} 🤺</h2>
          <button className="button-secondary" onClick={handleLogout} >
            Déconnexion
          </button>
        </header>

        <EventSelector key={user.id} userId={user.id} onReset={() => { setTournamentId(null); selectCompetition(null); }} onSelect={(tId, cId) => { setTournamentId(tId); selectCompetition(cId); setMainTab('pools'); }} />

        {selectedCompetitionId && <>
        {/* --- NOUVEAU MENU DE NAVIGATION --- */}
        <div className="app-tabs" role="group" aria-label="Sections des pronostics">
          <button onClick={() => setMainTab('pools')} aria-pressed={mainTab === 'pools'} >Poules</button>
          <button 
            onClick={() => setMainTab('play')} aria-pressed={mainTab === 'play'} 
            
          >
            Élimination directe
          </button>
          <button 
            onClick={() => setMainTab('leaderboard')} aria-pressed={mainTab === 'leaderboard'} 
            
          >
            🏆 Classement Général
          </button>
        </div>

        {/* --- CONTENU DE L'ONGLET SÉLECTIONNÉ --- */}
        
        {mainTab === 'play' && (
          <section className="direct-section">
            <h2>Élimination directe</h2>
            <p className="muted">Pronostiquez le vainqueur et le score de chaque match.</p>
            <ScoringRules type="matches" />
            {/* ESPACE ADMINISTRATEUR */}
            {user.isAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                
                {/* Synchronisation conservée, panneau masqué temporairement. */}
                {SHOW_SHEET_SYNC && <div style={{ padding: '15px', background: 'var(--soft)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <h3>Panneau de contrôle</h3>
                  <p style={{ color: 'var(--muted)', marginBottom: '15px' }}>
                    Mettez à jour les matchs de <strong>cette épreuve</strong> depuis votre fichier Google Sheets.
                  </p>
                  <button 
                    onClick={handleSyncSheet} 
                    disabled={isSyncing}
                    
                  >
                    {isSyncing ? 'Chargement...' : '🔄 Synchroniser Google Sheets'}
                  </button>
                  {syncMessage && <p style={{ marginTop: '10px' }}>{syncMessage}</p>}
                </div>}

                {/* Panneau d'ajustement manuel */}
                <div style={{ padding: '15px', background: 'var(--warning-soft)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <h3 style={{ color: 'var(--warning)', marginTop: '0', marginBottom: '15px' }}>🛠️ Ajustement Manuel des Points</h3>
                  <form onSubmit={handleAdjustPoints} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100px' }}>
                      <label style={{ marginBottom: '4px' }}>Joueur</label>
                      <select aria-label="Rechercher le joueur par" value={adjustBy} onChange={e => { setAdjustBy(e.target.value); setAdjustUserId(''); }}><option value="id">ID</option><option value="name">Nom</option></select>
                      <input aria-label="ID ou nom du joueur" type={adjustBy === 'id' ? 'number' : 'text'} value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} placeholder="Ex: 3"  />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', width: '100px' }}>
                      <label style={{ marginBottom: '4px' }}>Points (+/-)</label>
                      <input type="number" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} placeholder="Ex: 12"  />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', width: '150px' }}>
                      <label style={{ marginBottom: '4px' }}>Raison (opt.)</label>
                      <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Ex: Oubli"  />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', width: '100px' }}>
                      <label style={{ marginBottom: '4px' }}>ID Tournoi</label>
                      <input type="number" value={adjustTournamentId} onChange={(e) => setAdjustTournamentId(e.target.value)} placeholder={tournamentId}  />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', width: '100px' }}>
                      <label style={{ marginBottom: '4px' }}>ID Compét.</label>
                      <input type="number" value={adjustCompetitionId} onChange={(e) => setAdjustCompetitionId(e.target.value)} placeholder={selectedCompetitionId}  />
                    </div>

                    <button type="submit" style={{ height: 'fit-content' }}>
                      Attribuer
                    </button>
                  </form>
                  {adjustMessage && <p style={{ marginTop: '10px', color: adjustMessage.includes('✅') ? 'green' : 'red' }}>{adjustMessage}</p>}
                </div>

              </div>
            )}

            {/* Bloc Podium Prediction */}
            <PodiumPrediction key={selectedCompetitionId} tournamentId={tournamentId} selectedCompetitionId={selectedCompetitionId} user={user} />

            {finishedMatches.length > 0 && (
              <details style={{ marginBottom: '25px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', overflow: 'hidden' }}>
                <summary style={{ padding: '12px 15px', cursor: 'pointer', background: 'var(--success-soft)', color: 'var(--success)' }}>
                  📁 Historique des matchs terminés ({finishedMatches.length}) - Cliquer pour voir les résultats
                </summary>
                
                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--surface)' }}>
                  {finishedMatches.map((match) => {
                    const myPrediction = match.predictions?.find(p => p.userId === user.id);
                    return (
                      <div key={match.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div>
                          <span style={{ marginRight: '10px', color: 'var(--muted)' }}>#{match.id}</span>
                          <span>{match.player1}</span> <span style={{ margin: '0 6px', color: 'var(--muted)' }}>vs</span> <span>{match.player2}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <span style={{ background: 'var(--soft)', padding: '2px 8px', borderRadius: 'var(--radius)' }}>
                            {match.resultType === 'MEDICAL_WITHDRAWAL' ? `Retrait médical · Vainqueur : ${match.winnerName}` : `Score : ${match.score1} - ${match.score2}`}
                          </span>
                          <span style={{ color: 'var(--success)', fontStyle: 'italic' }}>
                            {myPrediction ? `Mon prono : ${myPrediction.predictedScore1} - ${myPrediction.predictedScore2}` : "Pas de prono"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}

            <div>
              <h3>Matchs à pronostiquer ({activeMatches.length})</h3>
              {activeMatches.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Aucun match actif pour le moment (en attente des résultats précédents).</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {activeMatches.map((match, index) => {
                    const myPrediction = match.predictions?.find(p => p.userId === user.id);
                    const inputs = predictionInputs[match.id] || {};
                    const msg = submitMessages[match.id];
                    const closed = match.isFinished || (!match.manualUnlock && (match.isLocked || (match.closesAt && matchNow >= Date.parse(match.closesAt))));

                    return (
                      <div key={match.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ marginRight: '10px', color: 'var(--muted)' }}>#{match.id}</span>
                            {match.round && <small>{match.round} · </small>}<span>{match.player1}</span> <span style={{ margin: '0 8px', color: 'var(--muted)' }}>vs</span> <span>{match.player2}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ background: 'var(--soft)', padding: '4px 10px', borderRadius: 'var(--radius)' }}>{match.score1 ?? '—'} : {match.score2 ?? '—'}</span>
                            <span style={{ padding: '4px 8px', borderRadius: 'var(--radius)', backgroundColor: 'var(--warning-soft)', color: 'var(--warning)' }}>{closed ? 'Pronostics clos' : 'Pronostics ouverts'}</span>
                          </div>
                        </div>

                        {match.closesAt && <p className="muted">Clôture prévue : {new Date(match.closesAt).toLocaleString('fr-FR')}</p>}
                        {user.isAdmin && <button type="button" onClick={async () => {
                          try { await API.put(`/matches/${match.id}/lock`, { isLocked: !closed }); await fetchMatches(selectedCompetitionId); }
                          catch (err) { setSubmitMessages(prev => ({ ...prev, [match.id]: { type: 'error', text: err.response?.data?.error || 'Modification impossible.' } })); }
                        }}>{closed ? 'Déverrouiller les pronostics' : 'Verrouiller les pronostics'}</button>}
                        <div style={{ background: 'var(--soft)', padding: '10px 15px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span >🎯 Mon pronostic :</span>
                          
                          <input 
                            disabled={closed}
                            aria-label={`Score prévu de ${match.player1}`} id={`input-${match.id}-1`}
                            type="number" min="0" max="15" placeholder="0"
                            value={inputs.score1 !== undefined ? inputs.score1 : (myPrediction?.predictedScore1 ?? '')}
                            onChange={(e) => handleScoreChange(match.id, 1, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, match.id, 1, index, activeMatches)}
                            style={{ width: '60px', textAlign: 'center' }}
                          />
                          <span style={{ color: 'var(--muted)' }}>-</span>
                          <input 
                            disabled={closed}
                            aria-label={`Score prévu de ${match.player2}`} id={`input-${match.id}-2`}
                            type="number" min="0" max="15" placeholder="0"
                            value={inputs.score2 !== undefined ? inputs.score2 : (myPrediction?.predictedScore2 ?? '')}
                            onChange={(e) => handleScoreChange(match.id, 2, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, match.id, 2, index, activeMatches)}
                            style={{ width: '60px', textAlign: 'center' }}
                          />
                          
                          <button disabled={closed} onClick={() => submitPrediction(match.id)} >Valider</button>
                          {myPrediction && <button disabled={closed} className="button-danger" onClick={() => deletePrediction(match.id)} >Supprimer</button>}
                          {msg && <span style={{ color: msg.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>{msg.text}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {mainTab === 'pools' && <PoolPredictions selectedCompetitionId={selectedCompetitionId} user={user} />}

        {mainTab === 'leaderboard' && (
          <GlobalLeaderboard />
        )}
        </>}

      </div>
    );
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
