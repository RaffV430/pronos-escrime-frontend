import React, { useState, useEffect } from 'react';
import API from '../api';

export default function PodiumPrediction({ tournamentId, selectedCompetitionId, user }) {
  const [gold, setGold] = useState('');
  const [silver, setSilver] = useState('');
  const [bronze1, setBronze1] = useState('');
  const [bronze2, setBronze2] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [allPredictions, setAllPredictions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('prediction');
  const [isLocked, setIsLocked] = useState(false);

  // 1. Charger les données du podium et le statut lorsque la compétition change
  useEffect(() => {
    if (!selectedCompetitionId) return;

    const fetchCompetitionData = async () => {
      try {
        const statusRes = await API.get(`/podium/competition-status/${selectedCompetitionId}`);
        setIsLocked(statusRes.data.isLocked);

        const podiumRes = await API.get(`/podium/${selectedCompetitionId}`);
        if (podiumRes.data) {
          setGold(podiumRes.data.gold || '');
          setSilver(podiumRes.data.silver || '');
          setBronze1(podiumRes.data.bronze1 || '');
          setBronze2(podiumRes.data.bronze2 || '');
        } else {
          setGold(''); setSilver(''); setBronze1(''); setBronze2('');
        }

        const allRes = await API.get(`/podium/all/competition/${selectedCompetitionId}`);
        if (allRes.data) {
          setAllPredictions(allRes.data);
        }
      } catch (err) {
        console.error("Erreur chargement données", err);
      }
    };

    fetchCompetitionData();
  }, [selectedCompetitionId]);

  // 2. Charger le classement général du tournoi
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await API.get(`/podium/leaderboard/${tournamentId}`);
        if (res.data) setLeaderboard(res.data);
      } catch (err) {
        console.error("Erreur classement", err);
      }
    };
    fetchLeaderboard();
  }, [tournamentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      setMessage('❌ Il est trop tard pour modifier le podium.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await API.post('/podium', { competitionId: selectedCompetitionId, gold, silver, bronze1, bronze2 });
      if (res.status === 200 || res.status === 201) setMessage('Pronostic enregistré avec succès ! 🤺');
    } catch (err) {
      if (err.response?.status === 403) setIsLocked(true);
      setMessage('Erreur lors de l’enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async () => {
    try {
      const res = await API.put(`/podium/competition/${selectedCompetitionId}/toggle-lock`, { isLocked: !isLocked });
      setIsLocked(res.data.competition.isPodiumLocked);
      setMessage(res.data.message);
    } catch (err) {
      console.error(err);
      setMessage("Erreur lors de la modification du verrouillage.");
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc',
    backgroundColor: isLocked ? '#e9ecef' : '#fff', color: isLocked ? '#495057' : '#000', fontWeight: '500'
  };

  if (!selectedCompetitionId) {
    return <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>Veuillez sélectionner une compétition.</div>;
  }

  return (
    <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', margin: '20px 0', border: '1px solid #ddd', color: '#333' }}>
      <h3 style={{ marginTop: '0' }}>🏆 Pronostics & Classement du Tournoi</h3>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('prediction')} style={{ padding: '8px 15px', background: activeTab === 'prediction' ? '#007bff' : '#e2e3e5', color: activeTab === 'prediction' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>🎯 Pronostics Podium</button>
        <button onClick={() => setActiveTab('leaderboard')} style={{ padding: '8px 15px', background: activeTab === 'leaderboard' ? '#28a745' : '#e2e3e5', color: activeTab === 'leaderboard' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>📊 Classement Général</button>
      </div>

      {activeTab === 'prediction' ? (
        <>
          {/* Espace Administrateur */}
          {user && user.isAdmin && (
            <div style={{ marginBottom: '20px', maxWidth: '400px', background: '#fff3cd', padding: '10px', borderRadius: '4px', border: '1px solid #ffeeba' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.85em', fontWeight: 'bold', color: '#856404' }}>🛠️ Espace Administrateur (cette compétition)</p>
              <button 
                onClick={toggleLock} 
                type="button"
                style={{ width: '100%', padding: '10px', background: isLocked ? '#28a745' : '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isLocked ? '🔓 Déverrouiller cette compétition' : '🔒 Verrouiller cette compétition'}
              </button>
            </div>
          )}

          {isLocked && <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px', fontWeight: 'bold', maxWidth: '400px' }}>🔒 Les pronostics sont clos pour cette compétition.</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>🥇 Or : </label><input type="text" value={gold} onChange={(e) => setGold(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur" style={inputStyle} /></div>
            <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>🥈 Argent : </label><input type="text" value={silver} onChange={(e) => setSilver(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur" style={inputStyle} /></div>
            <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>🥉 Bronze 1 : </label><input type="text" value={bronze1} onChange={(e) => setBronze1(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur" style={inputStyle} /></div>
            <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>🥉 Bronze 2 : </label><input type="text" value={bronze2} onChange={(e) => setBronze2(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur" style={inputStyle} /></div>
            {!isLocked && <button type="submit" disabled={loading} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>{loading ? 'Enregistrement...' : 'Valider mon podium'}</button>}
          </form>
          
          {message && <p style={{ marginTop: '10px', fontWeight: 'bold', color: message.includes('succès') || message.includes('ouverts') ? 'green' : 'red' }}>{message}</p>}

          {isLocked && (
            <div style={{ marginTop: '30px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
              <h4>📊 Pronostics de tous les participants (cette compétition)</h4>
              {allPredictions.length === 0 ? <p style={{ fontStyle: 'italic' }}>Aucun pronostic enregistré.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', maxWidth: '400px' }}>
                  {allPredictions.map((pred) => (
                    <div key={pred.id} style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}>
                      <strong>{pred.user?.name || 'Utilisateur'}</strong>
                      <ul style={{ margin: '5px 0 0 20px', padding: 0, fontSize: '14px' }}>
                        <li>🥇 Or : {pred.gold}</li>
                        <li>🥈 Argent : {pred.silver}</li>
                        <li>🥉 Bronze : {pred.bronze1} / {pred.bronze2}</li>
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div>
          <h4>🏆 Classement Général du Tournoi</h4>
          {leaderboard.length === 0 ? <p style={{ fontStyle: 'italic' }}>Aucun point attribué pour le moment.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '500px', marginTop: '15px' }}>
              {leaderboard.map((entry, index) => (
                <div key={entry.user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 15px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1em', width: '25px' }}>{index === 0 ? '👑' : `#${index + 1}`}</span>
                    <span style={{ fontWeight: '600' }}>{entry.user.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85em', color: '#666' }}>({entry.podiumsCount} podiums pronostiqués)</span>
                    <span style={{ background: '#28a745', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>{entry.totalPoints} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}