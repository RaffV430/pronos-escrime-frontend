import React, { useState, useEffect } from 'react';
import API from '../api';

export default function GlobalLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [tournaments, setTournaments] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  
  // Format : "all", "tournament_X", ou "competition_Y"
  const [selectedFilter, setSelectedFilter] = useState('all'); 

  // 1. Charger la liste de TOUS les tournois et de TOUTES les compétitions
  useEffect(() => {
    const fetchSelectData = async () => {
      try {
        // --- NOUVEAU CODE DYNAMIQUE ---
        const tourRes = await API.get('/tournaments');
        setTournaments(tourRes.data);
        // ------------------------------

        const compRes = await API.get(`/podium/competitions/1`); // On récupère celles du tournoi 1
        if (compRes.data) {
          setCompetitions(compRes.data);
        }
      } catch (err) {
        console.error('Erreur chargement des filtres :', err);
      }
    };
    fetchSelectData();
  }, []);

  // 2. Charger le classement en fonction du filtre choisi
  const fetchGlobalLeaderboard = async () => {
    setLoading(true);
    try {
      let url = '/matches/leaderboard';
      
      if (selectedFilter.startsWith('tournament_')) {
        const tId = selectedFilter.split('_')[1];
        url += `?tournamentId=${tId}`;
      } else if (selectedFilter.startsWith('competition_')) {
        const cId = selectedFilter.split('_')[1];
        url += `?competitionId=${cId}`;
      }
        
      const res = await API.get(url);
      setLeaderboard(res.data);
    } catch (err) {
      console.error('Erreur chargement classement global :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, [selectedFilter]);

  return (
    <div style={{ margin: '30px 0', padding: '20px', background: '#fff', borderRadius: '8px', border: '2px solid #007bff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#007bff' }}>🌍 Classement</h3>
        <button onClick={fetchGlobalLeaderboard} style={{ fontSize: '0.85em', padding: '6px 12px', cursor: 'pointer', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          🔄 Actualiser
        </button>
      </div>
      
      {/* --- MENU DÉROULANT DES FILTRES --- */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
          🎯 Filtrer le classement :
        </label>
        <select 
          value={selectedFilter} 
          onChange={(e) => setSelectedFilter(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', fontSize: '1em' }}
        >
          <option value="all">🌍 Classement Général Absolu (Toute la saison)</option>
          
          <optgroup label="Par Tournoi">
            {tournaments.map((t) => (
              <option key={`t_${t.id}`} value={`tournament_${t.id}`}>
                🏆 Tournoi : {t.name}
              </option>
            ))}
          </optgroup>

          <optgroup label="Par Épreuve / Compétition">
            {competitions.map((comp) => (
              <option key={`c_${comp.id}`} value={`competition_${comp.id}`}>
                ⚔️ Épreuve : {comp.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Affichage des résultats */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Chargement du classement...</p>
      ) : leaderboard.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: '#666' }}>Aucun point distribué pour cette sélection.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leaderboard.map((u, index) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '12px 15px', borderRadius: '6px', border: '1px solid #ddd' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.2em', width: '30px', textAlign: 'center' }}>
                  {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{u.name || 'Utilisateur'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.85em', color: '#555', background: '#e9ecef', padding: '4px 8px', borderRadius: '4px' }}>
                  <span title="Points obtenus via les pronostics de matchs">
                    🤺 Matchs: <strong>{u.matchPoints}</strong>
                  </span>
                  <span style={{ color: '#ccc' }}>|</span>
                  <span title="Points obtenus via les pronostics de podiums">
                    🏆 Podiums: <strong>{u.podiumPoints}</strong>
                  </span>
                  {u.adjustmentPoints !== 0 && (
                    <>
                      <span style={{ color: '#ccc' }}>|</span>
                      <span title="Ajustements manuels (Bonus/Malus)" style={{ color: u.adjustmentPoints > 0 ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                        🛠️ {u.adjustmentPoints > 0 ? `+${u.adjustmentPoints}` : u.adjustmentPoints}
                      </span>
                    </>
                  )}
                </div>

                <span style={{ background: '#007bff', color: '#fff', padding: '6px 15px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em', minWidth: '70px', textAlign: 'center' }}>
                  {u.totalPoints} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}