import { useCallback, useState, useEffect } from 'react';
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
        const tournamentList = tourRes.data || [];
        setTournaments(tournamentList);

        const competitionResponses = await Promise.all(
          tournamentList.map((tournament) => API.get(`/podium/competitions/${tournament.id}`)),
        );
        setCompetitions(competitionResponses.flatMap((response) => response.data || []));
      } catch (err) {
        console.error('Erreur chargement des filtres :', err);
      }
    };
    fetchSelectData();
  }, []);

  // 2. Charger le classement en fonction du filtre choisi
  const fetchGlobalLeaderboard = useCallback(async () => {
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
  }, [selectedFilter]);

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, [fetchGlobalLeaderboard]);

  return (
    <div style={{ margin: '30px 0', padding: '20px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>🌍 Classement</h3>
        <button onClick={fetchGlobalLeaderboard} >
          🔄 Actualiser
        </button>
      </div>
      
      {/* --- MENU DÉROULANT DES FILTRES --- */}
      <div style={{ marginBottom: '20px', padding: '15px', background: 'var(--soft)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
          🎯 Filtrer le classement :
        </label>
        <select 
          value={selectedFilter} 
          onChange={(e) => setSelectedFilter(e.target.value)}
          style={{ width: '100%' }}
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
        <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Chargement du classement...</p>
      ) : leaderboard.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Aucun point distribué pour cette sélection.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leaderboard.map((u, index) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--soft)', padding: '12px 15px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '30px', textAlign: 'center' }}>
                  {(u.rank || index+1) === 1 ? '👑' : `#${u.rank || index+1}`}
                </span>
                <span >{u.name || 'Utilisateur'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '10px', color: 'var(--muted)', background: 'var(--soft)', padding: '4px 8px', borderRadius: 'var(--radius)' }}>
                  <span title="Points obtenus via les pronostics de matchs">
                    🤺 Matchs: <strong>{u.matchPoints}</strong>
                  </span>
                  <span style={{ color: '#ccc' }}>|</span>
                  <span title="Points obtenus via les pronostics de podiums">
                    🏆 Podiums: <strong>{u.podiumPoints}</strong>
                  </span>
                  <span title="Points obtenus via les pronostics de poules">Poules : <strong>{u.poolPoints ?? 0}</strong></span>
                  <span>Défis : <strong>{u.challengePoints??0}</strong></span>
                  {u.adjustmentPoints !== 0 && (
                    <>
                      <span style={{ color: '#ccc' }}>|</span>
                      <span title="Ajustements manuels (Bonus/Malus)" style={{ color: u.adjustmentPoints > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        🛠️ {u.adjustmentPoints > 0 ? `+${u.adjustmentPoints}` : u.adjustmentPoints}
                      </span>
                    </>
                  )}
                </div>

                <span style={{ background: 'var(--primary)', color: 'var(--surface)', padding: '6px 15px', borderRadius: 'var(--radius)', minWidth: '70px', textAlign: 'center' }}>
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
