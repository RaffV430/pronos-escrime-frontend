import React, { useState, useEffect } from 'react';
import API from '../api';

export default function Dashboard({ user, onLogout }) {
  const [matches, setMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [adminScores, setAdminScores] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matchesRes, boardRes] = await Promise.all([
        API.get('/matches'),
        API.get('/matches/leaderboard'),
      ]);
      setMatches(matchesRes.data);
      setLeaderboard(boardRes.data);
    } catch (err) {
      console.error('Erreur chargement des données:', err);
    }
  };

  // --- Gestion de la saisie utilisateur (Pronostic) ---
  const handleScoreChange = (matchId, team, value) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value,
      },
    }));
  };

  const submitPrediction = async (matchId) => {
    const pred = predictions[matchId];
    if (!pred || pred.score1 === undefined || pred.score2 === undefined) {
      setMessage('⚠️ Veuillez entrer les deux scores.');
      return;
    }

    try {
      await API.post('/predictions', {
        matchId,
        score1: parseInt(pred.score1, 10),
        score2: parseInt(pred.score2, 10),
      });
      setMessage('🎯 Pronostic enregistré avec succès !');
      loadData();
    } catch (err) {
      setMessage('❌ Erreur lors de l’enregistrement du pronostic.');
    }
  };

  // --- Gestion ADMIN : Validation du score réel ---
  const handleAdminScoreChange = (matchId, team, value) => {
    setAdminScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value,
      },
    }));
  };

  const submitFinalResult = async (matchId) => {
    const scoreData = adminScores[matchId];
    if (!scoreData || scoreData.score1 === undefined || scoreData.score2 === undefined) {
      setMessage('⚠️ Rentrez les deux scores finaux.');
      return;
    }

    try {
      await API.post(`/matches/${matchId}/result`, {
        score1: parseInt(scoreData.score1, 10),
        score2: parseInt(scoreData.score2, 10),
      });
      setMessage('🏆 Résultat validé ! Les points ont été calculés.');
      loadData(); // Rafraîchit les matchs et le classement automatiquement !
    } catch (err) {
      setMessage('❌ Erreur lors de la validation du résultat.');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* En-tête */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h2>🤺 MPP Escrime</h2>
        <div>
          <span>Bonjour, <strong>{user.name}</strong> {user.isAdmin && '👑 (Admin)'}</span>
          <button onClick={onLogout} style={{ marginLeft: '15px', padding: '6px 12px', cursor: 'pointer' }}>Déconnexion</button>
        </div>
      </header>

      {message && (
        <div style={{ padding: '10px', backgroundColor: '#e0f7fa', borderRadius: '5px', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        
        {/* Liste des matchs */}
        <section>
          <h3>⚔️ Matchs à venir & Résultats</h3>
          {matches.map((match) => (
            <div key={match.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px', backgroundColor: match.isFinished ? '#f9f9f9' : '#fff' }}>
              
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                {match.fencer1} vs {match.fencer2}
                {match.isFinished && <span style={{ color: 'green', marginLeft: '10px' }}>(Terminé)</span>}
              </div>

              {/* Si le match est fini, afficher le score final */}
              {match.isFinished ? (
                <p style={{ fontSize: '1.1em', fontWeight: 'bold' }}>
                  Score final : {match.score1} - {match.score2}
                </p>
              ) : (
                /* Sinon, formulaire de pronostic pour le tireur */
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    placeholder="Score 1"
                    style={{ width: '70px', padding: '5px' }}
                    onChange={(e) => handleScoreChange(match.id, 'score1', e.target.value)}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Score 2"
                    style={{ width: '70px', padding: '5px' }}
                    onChange={(e) => handleScoreChange(match.id, 'score2', e.target.value)}
                  />
                  <button onClick={() => submitPrediction(match.id)} style={{ padding: '6px 12px', cursor: 'pointer' }}>
                    Parier
                  </button>
                </div>
              )}

              {/* SECTION RESERVÉE À L'ADMINISTRATEUR */}
              {user.isAdmin && !match.isFinished && (
                <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #ccc', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '5px' }}>
                  <small style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>👑 Panneau Admin : Entrer le score officiel</small>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="Résultat 1"
                      style={{ width: '80px', padding: '5px' }}
                      onChange={(e) => handleAdminScoreChange(match.id, 'score1', e.target.value)}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Résultat 2"
                      style={{ width: '80px', padding: '5px' }}
                      onChange={(e) => handleAdminScoreChange(match.id, 'score2', e.target.value)}
                    />
                    <button 
                      onClick={() => submitFinalResult(match.id)}
                      style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Valider & Calculer Points
                    </button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </section>

        {/* Classement Général */}
        <section>
          <h3>🏆 Classement</h3>
          <ol style={{ paddingLeft: '20px' }}>
            {leaderboard.map((u) => (
              <li key={u.id} style={{ marginBottom: '8px' }}>
                <strong>{u.name}</strong> : {u.totalPoints || 0} pts
              </li>
            ))}
          </ol>
        </section>

      </div>
    </div>
  );
}