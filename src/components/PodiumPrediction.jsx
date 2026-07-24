import React, { useState, useEffect } from 'react';
import API from '../api';

export default function PodiumPrediction({ tournamentId, activeMatchesCount }) {
  const [gold, setGold] = useState('');
  const [silver, setSilver] = useState('');
  const [bronze1, setBronze1] = useState('');
  const [bronze2, setBronze2] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // État pour stocker les podiums de tous les utilisateurs
  const [allPredictions, setAllPredictions] = useState([]);

  const isLocked = activeMatchesCount < 16;

  // Récupérer son propre pronostic
  useEffect(() => {
    const fetchPodium = async () => {
      try {
        const res = await API.get(`/podium/${tournamentId}`);
        if (res.data) {
          setGold(res.data.gold || '');
          setSilver(res.data.silver || '');
          setBronze1(res.data.bronze1 || '');
          setBronze2(res.data.bronze2 || '');
        }
      } catch (err) {
        console.error("Erreur chargement podium", err);
      }
    };
    fetchPodium();
  }, [tournamentId]);

  // Récupérer les pronostics de TOUT LE MONDE uniquement si c'est verrouillé
  useEffect(() => {
    const fetchAllPodiums = async () => {
      if (!isLocked) return; 
      try {
        const res = await API.get(`/podium/all/${tournamentId}`);
        if (res.data) {
          setAllPredictions(res.data);
        }
      } catch (err) {
        console.error("Erreur chargement de tous les podiums", err);
      }
    };
    fetchAllPodiums();
  }, [tournamentId, isLocked]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      setMessage('❌ Il est trop tard pour modifier le podium (moins de 16 matchs restants).');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await API.post('/podium', {
        tournamentId,
        gold,
        silver,
        bronze1,
        bronze2
      });

      if (res.status === 200 || res.status === 201) {
        setMessage('Pronostic de podium enregistré avec succès ! 🤺');
      }
    } catch (err) {
      // 🛡️ S'assure qu'on extrait bien une chaîne de caractères et non un objet brut
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Erreur lors de l’enregistrement';
      setMessage(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    backgroundColor: isLocked ? '#e9ecef' : '#fff',
    color: isLocked ? '#495057' : '#000',
    fontWeight: '500'
  };

  return (
    <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', margin: '20px 0', border: '1px solid #ddd', color: '#333' }}>
      <h3 style={{ marginTop: '0' }}>🏆 Pronostic Podium</h3>
      
      {isLocked && (
        <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '15px', fontWeight: 'bold' }}>
          🔒 Les pronostics de podium sont verrouillés (moins de 16 matchs restants).
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>🥇 Or : </label>
          <input type="text" value={gold} onChange={(e) => setGold(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>🥈 Argent : </label>
          <input type="text" value={silver} onChange={(e) => setSilver(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>🥉 Bronze 1 : </label>
          <input type="text" value={bronze1} onChange={(e) => setBronze1(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>🥉 Bronze 2 : </label>
          <input type="text" value={bronze2} onChange={(e) => setBronze2(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur" style={inputStyle} />
        </div>

        {!isLocked && (
          <button type="submit" disabled={loading} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>
            {loading ? 'Enregistrement...' : 'Valider mon podium'}
          </button>
        )}
      </form>
      {message && <p style={{ marginTop: '10px', fontWeight: 'bold', color: message.includes('succès') ? 'green' : 'red' }}>{message}</p>}

      {/* Affichage des pronostics de tout le monde si verrouillé */}
      {isLocked && (
        <div style={{ marginTop: '30px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
          <h4>📊 Pronostics de tous les participants</h4>
          {allPredictions.length === 0 ? (
            <p style={{ fontStyle: 'italic' }}>Aucun pronostic enregistré pour ce tournoi.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {allPredictions.map((pred) => (
                <div key={pred.id} style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <strong>{pred.user?.username || 'Utilisateur'}</strong>
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
    </div>
  );
}