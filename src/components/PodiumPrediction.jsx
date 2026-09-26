import { useCallback, useState, useEffect } from 'react';
import API from '../api';

export default function PodiumPrediction({ tournamentId, selectedCompetitionId, user }) {
  const [gold, setGold] = useState('');
  const [silver, setSilver] = useState('');
  const [bronze1, setBronze1] = useState('');
  const [bronze2, setBronze2] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // États pour le formulaire de validation Admin
  const [offGold, setOffGold] = useState('');
  const [offSilver, setOffSilver] = useState('');
  const [offBronze1, setOffBronze1] = useState('');
  const [offBronze2, setOffBronze2] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const [allPredictions, setAllPredictions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('prediction');
  const [isLocked, setIsLocked] = useState(false);

  // Recharger le classement (utile après la validation admin)
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await API.get(`/podium/leaderboard/${tournamentId}`);
      if (res.data) setLeaderboard(res.data);
    } catch (err) {
      console.error("Erreur classement", err);
    }
  }, [tournamentId]);

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

        if (statusRes.data.isLocked || user?.isAdmin) {
          const allRes = await API.get(`/podium/all/competition/${selectedCompetitionId}`);
          if (allRes.data) setAllPredictions(allRes.data);
        } else {
          setAllPredictions([]);
        }
        
      } catch (err) {
        console.error("Erreur chargement données", err);
      }
    };

    fetchCompetitionData();
  }, [selectedCompetitionId, user?.isAdmin]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard, selectedCompetitionId]); // On recharge le classement quand l'épreuve change

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

  const [lockBusy, setLockBusy] = useState(false);
  useEffect(() => {
    if (!selectedCompetitionId) return;
    const controller = new AbortController();
    const timer = setInterval(() => API.get(`/podium/competition-status/${selectedCompetitionId}`, { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setIsLocked(data.isLocked); }).catch(() => {}), 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selectedCompetitionId]);

  const toggleLock = async () => {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      const res = await API.put(`/podium/competition/${selectedCompetitionId}/toggle-lock`, { isLocked: !isLocked });
      setIsLocked(res.data.competition.isPodiumLocked);
      setAdminMessage(res.data.message);
    } catch (err) {
      setAdminMessage(err.response?.data?.error || "Erreur lors de la modification du verrouillage.");
    } finally { setLockBusy(false); }
  };

  // Nouvelle fonction pour soumettre le résultat OFFICIEL
  const handleResolvePodium = async (e) => {
    e.preventDefault();
    setIsResolving(true);
    setAdminMessage('');
    try {
      const res = await API.post(`/podium/competition/${selectedCompetitionId}/resolve`, {
        gold: offGold, silver: offSilver, bronze1: offBronze1, bronze2: offBronze2
      });
      setAdminMessage(res.data.message);
      setIsLocked(true); // Ça verrouille automatiquement
      fetchLeaderboard(); // Recharge les points en direct !
    } catch (err) {
      setAdminMessage("❌ Erreur : " + (err.response?.data?.error || err.message));
    } finally {
      setIsResolving(false);
    }
  };



  if (!selectedCompetitionId) {
    return <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius)', margin: '20px 0' }}>Veuillez sélectionner une compétition.</div>;
  }

  return (
    <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius)', margin: '20px 0', border: '1px solid var(--border)', color: 'var(--text)' }}>
      <h3 style={{ marginTop: '0' }}>🏆 Pronostics et Classement Podium</h3>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        <button aria-pressed={activeTab === 'prediction'} onClick={() => setActiveTab('prediction')} >🎯 Pronostics Podium</button>
        <button aria-pressed={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} >📊 Classement Pronos Podium</button>
      </div>

      {activeTab === 'prediction' ? (
        <>
          {/* Espace Administrateur */}
          {user && user.isAdmin && (
            <div style={{ marginBottom: '25px', background: 'var(--warning-soft)', padding: '15px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 15px 0', color: 'var(--warning)' }}>👑 ESPACE ADMIN - VALIDER L'ÉPREUVE</p>
              
              <button disabled={lockBusy} onClick={toggleLock} type="button" style={{ width: '100%', marginBottom: '15px' }}>
                {isLocked ? '🔓 Déverrouiller la saisie aux joueurs' : '🔒 Bloquer la saisie aux joueurs'}
              </button>

              <form onSubmit={handleResolvePodium} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed #d39e00', paddingTop: '15px' }}>
                <p style={{ margin: 0, color: 'var(--warning)' }}>Entrez le podium officiel pour calculer les points :</p>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input type="text" placeholder="🥇 Or" required value={offGold} onChange={(e) => setOffGold(e.target.value)} style={{ flex: 1 }} />
                  <input type="text" placeholder="🥈 Argent" required value={offSilver} onChange={(e) => setOffSilver(e.target.value)} style={{ flex: 1 }} />
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input type="text" placeholder="🥉 Bronze 1" required value={offBronze1} onChange={(e) => setOffBronze1(e.target.value)} style={{ flex: 1 }} />
                  <input type="text" placeholder="🥉 Bronze 2" required value={offBronze2} onChange={(e) => setOffBronze2(e.target.value)} style={{ flex: 1 }} />
                </div>
                <button type="submit" disabled={isResolving} style={{ marginTop: '5px' }}>
                  {isResolving ? 'Calcul en cours...' : '🏁 Valider le podium et distribuer les points'}
                </button>
              </form>

              {adminMessage && <p style={{ marginTop: '10px', color: 'var(--warning)' }}>{adminMessage}</p>}
            </div>
          )}

          {isLocked && <div style={{ padding: '10px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius)', marginBottom: '15px', maxWidth: '400px' }}>🔒 Les pronostics sont clos pour cette compétition.</div>}

          {/* Formulaire Joueur */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
            <div><label style={{ display: 'block', marginBottom: '5px' }}>🥇 Or : </label><input type="text" value={gold} onChange={(e) => setGold(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur"  /></div>
            <div><label style={{ display: 'block', marginBottom: '5px' }}>🥈 Argent : </label><input type="text" value={silver} onChange={(e) => setSilver(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur"  /></div>
            <div><label style={{ display: 'block', marginBottom: '5px' }}>🥉 Bronze 1 : </label><input type="text" value={bronze1} onChange={(e) => setBronze1(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur"  /></div>
            <div><label style={{ display: 'block', marginBottom: '5px' }}>🥉 Bronze 2 : </label><input type="text" value={bronze2} onChange={(e) => setBronze2(e.target.value)} disabled={isLocked} required placeholder="Nom du tireur"  /></div>
            {!isLocked && <button type="submit" disabled={loading} style={{ marginTop: '5px' }}>{loading ? 'Enregistrement...' : 'Valider mon podium'}</button>}
          </form>
          
          {message && <p style={{ marginTop: '10px', color: message.includes('succès') ? 'green' : 'red' }}>{message}</p>}

          {isLocked && (
            <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h4>📊 Pronostics podium de tous les participants</h4>
              {allPredictions.length === 0 ? <p style={{ fontStyle: 'italic' }}>Aucun pronostic enregistré.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', maxWidth: '400px' }}>
                  {allPredictions.map((pred) => (
                    <div key={pred.id} style={{ background: 'var(--surface)', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{pred.user?.name || 'Utilisateur'}</strong>
                        <span style={{ background: 'var(--success)', color: 'white', padding: '2px 6px', borderRadius: 'var(--radius)' }}>{pred.pointsEarned || 0} pts</span>
                      </div>
                      <ul style={{ margin: '8px 0 0 20px', padding: 0, color: 'var(--muted)' }}>
                        <li>🥇 {pred.gold}</li>
                        <li>🥈 {pred.silver}</li>
                        <li>🥉 {pred.bronze1} / {pred.bronze2}</li>
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
          <h4>🏆 Classement pronos podium </h4>
          {leaderboard.length === 0 ? <p style={{ fontStyle: 'italic' }}>Aucun point attribué pour le moment.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '500px', marginTop: '15px' }}>
              {leaderboard.map((entry, index) => (
                <div key={entry.user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '12px 15px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '25px' }}>{index === 0 ? '👑' : `#${index + 1}`}</span>
                    <span >{entry.user.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)' }}>({entry.podiumsCount} grille(s))</span>
                    <span style={{ background: 'var(--success)', color: 'var(--surface)', padding: '4px 10px', borderRadius: 'var(--radius)' }}>{entry.totalPoints} pts</span>
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
