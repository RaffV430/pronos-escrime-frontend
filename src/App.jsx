import React, { useState, useEffect } from 'react';
import API from './api';
import PodiumPrediction from './components/PodiumPrediction';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [matches, setMatches] = useState([]);
  const [predictionInputs, setPredictionInputs] = useState({});
  const [submitMessages, setSubmitMessages] = useState({});

  const fetchMatches = async () => {
    try {
      const res = await API.get('/matches');
      setMatches(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des matchs :', err);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await API.get('/auth/me');
          setUser(res.data);
          fetchMatches();
        } catch (err) {
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
    setIsSyncing(true);
    setSyncMessage('Synchronisation en cours...');
    try {
      const res = await API.post('/matches/sync-sheet');
      setSyncMessage(`✅ Succès : ${res.data.details?.count || 0} matchs mis à jour !`);
      fetchMatches();
    } catch (err) {
      setSyncMessage('❌ Erreur lors de la synchronisation.');
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
      fetchMatches(); 
    } catch (err) {
      // 🛡️ CORRECTION ICI : On s'assure d'extraire du texte et non un objet brut
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Une erreur est survenue';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete API.defaults.headers.common['Authorization'];
    setUser(null);
    setMatches([]);
  };

  const handleScoreChange = (matchId, playerNum, value) => {
    setPredictionInputs(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [`score${playerNum}`]: value
      }
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
      fetchMatches(); 
    } catch (err) {
      setSubmitMessages(prev => ({ ...prev, [matchId]: { type: 'error', text: '❌ Erreur' }}));
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
      fetchMatches(); 
    } catch (err) {
      setSubmitMessages(prev => ({ ...prev, [matchId]: { type: 'error', text: '❌ Erreur suppression' }}));
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

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>Chargement de la session...</div>;
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
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        {/* En-tête de l'application */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Bienvenue, {user.username || 'Utilisateur'} ! {user.isAdmin && '👑'} 🤺</h2>
          <button onClick={handleLogout} style={{ padding: '8px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>

        <hr style={{ margin: '20px 0' }} />

        {/* Panneau de contrôle administrateur / synchronisation */}
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3>Panneau de contrôle</h3>
          <p style={{ fontSize: '0.9em', color: '#555', marginBottom: '15px' }}>
            Mettez à jour les matchs et les scores depuis votre fichier Google Sheets.
          </p>
          <button 
            onClick={handleSyncSheet} 
            disabled={isSyncing}
            style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: isSyncing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {isSyncing ? 'Chargement...' : '🔄 Synchroniser Google Sheets'}
          </button>
          {syncMessage && <p style={{ marginTop: '10px', fontWeight: 'bold' }}>{syncMessage}</p>}
        </div>

        {/* 🏆 Blocs de pronostic du podium */}
        <PodiumPrediction tournamentId={1} user={user} />

        {/* Historique des matchs terminés */}
        {finishedMatches.length > 0 && (
          <details style={{ marginBottom: '25px', border: '1px solid #c3e6cb', borderRadius: '8px', background: '#f8fff9', overflow: 'hidden' }}>
            <summary style={{ padding: '12px 15px', cursor: 'pointer', background: '#d4edda', fontWeight: 'bold', color: '#155724', fontSize: '1.05em' }}>
              📁 Historique des matchs terminés ({finishedMatches.length}) - Cliquer pour voir les résultats et vos pronos
            </summary>
            
            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff' }}>
              {finishedMatches.map((match) => {
                const myPrediction = match.predictions?.find(p => p.userId === user.id);
                return (
                  <div key={match.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee', fontSize: '0.95em' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', marginRight: '10px', color: '#666' }}>#{match.id}</span>
                      <span>{match.player1}</span> 
                      <span style={{ margin: '0 6px', color: '#888' }}>vs</span> 
                      <span>{match.player2}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span style={{ background: '#e2e3e5', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        Score : {match.score1} - {match.score2}
                      </span>
                      <span style={{ color: '#155724', fontStyle: 'italic', fontSize: '0.9em' }}>
                        {myPrediction ? `Mon prono : ${myPrediction.predictedScore1} - ${myPrediction.predictedScore2}` : "Pas de prono"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {/* Liste des matchs actifs à pronostiquer */}
        <div>
          <h3>Matchs à pronostiquer ({activeMatches.length})</h3>
          {activeMatches.length === 0 ? (
            <p style={{ color: '#777', fontStyle: 'italic' }}>Aucun match actif pour le moment (en attente des résultats précédents).</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {activeMatches.map((match, index) => {
                const myPrediction = match.predictions?.find(p => p.userId === user.id);
                const inputs = predictionInputs[match.id] || {};
                const msg = submitMessages[match.id];

                return (
                  <div key={match.id} style={{ border: '1px solid #ddd', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}>
                    
                    <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', marginRight: '10px', color: '#555' }}>#{match.id}</span>
                        <span>{match.player1}</span> 
                        <span style={{ margin: '0 8px', color: '#888', fontWeight: 'bold' }}>vs</span> 
                        <span>{match.player2}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '1.2em', fontWeight: 'bold', background: '#eee', padding: '4px 10px', borderRadius: '4px' }}>
                          - : -
                        </span>
                        <span style={{ fontSize: '0.85em', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fff3cd', color: '#856404' }}>
                          En cours
                        </span>
                      </div>
                    </div>

                    <div style={{ background: '#f4f6f8', padding: '10px 15px', borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#333' }}>🎯 Mon pronostic :</span>
                      
                      <input 
                        id={`input-${match.id}-1`}
                        type="number" min="0" max="15" placeholder="0"
                        value={inputs.score1 !== undefined ? inputs.score1 : (myPrediction?.predictedScore1 ?? '')}
                        onChange={(e) => handleScoreChange(match.id, 1, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, match.id, 1, index, activeMatches)}
                        style={{ width: '60px', padding: '6px', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                      <span style={{ color: '#666', fontWeight: 'bold' }}>-</span>
                      
                      <input 
                        id={`input-${match.id}-2`}
                        type="number" min="0" max="15" placeholder="0"
                        value={inputs.score2 !== undefined ? inputs.score2 : (myPrediction?.predictedScore2 ?? '')}
                        onChange={(e) => handleScoreChange(match.id, 2, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, match.id, 2, index, activeMatches)}
                        style={{ width: '60px', padding: '6px', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                      
                      <button 
                        onClick={() => submitPrediction(match.id)}
                        style={{ padding: '6px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Valider
                      </button>

                      {myPrediction && (
                        <button 
                          onClick={() => deletePrediction(match.id)}
                          style={{ padding: '6px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Supprimer
                        </button>
                      )}
                      
                      {msg && <span style={{ color: msg.type === 'error' ? '#dc3545' : '#28a745', fontSize: '0.85em', fontWeight: 'bold' }}>{msg.text}</span>}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Écran de Connexion / Inscription si l'utilisateur n'est pas connecté
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2>{isRegister ? 'Inscription' : 'Connexion'}</h2>
      {/* 🛡️ CORRECTION ICI AUSSI : On s'assure de l'affichage sécurisé */}
      {error && <div style={{ color: 'red', marginBottom: '10px', fontWeight: 'bold' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isRegister && (
          <input type="text" placeholder="Nom d'utilisateur" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={{ padding: '8px' }} />
        )}
        <input type="text" placeholder={isRegister ? "Email" : "Identifiant"} required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ padding: '8px' }} />
        <input type="password" placeholder="Mot de passe" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ padding: '8px' }} />
        <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isRegister ? "S'inscrire" : 'Se connecter'}
        </button>
      </form>
      <p style={{ marginTop: '15px', fontSize: '0.9em' }}>
        {isRegister ? 'Déjà un compte ?' : "Pas encore de compte ?"} {' '}
        <button onClick={() => setIsRegister(!isRegister)} style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}>
          {isRegister ? 'Se connecter' : "S'inscrire"}
        </button>
      </p>
    </div>
  );
}