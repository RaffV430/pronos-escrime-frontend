import { useCallback, useState, useEffect } from 'react';
import API from '../api';

export default function PodiumPrediction({ tournamentId, selectedCompetitionId, user, adminOnly = false }) {
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState({});
  const [search, setSearch] = useState('');
  const [legacy, setLegacy] = useState({});
  const [isLocked, setIsLocked] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [allPredictions, setAllPredictions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('prediction');
  const team = options?.format === 'TEAM';
  const slots = team ? ['gold', 'silver', 'bronze1'] : ['gold', 'silver', 'bronze1', 'bronze2'];
  const labels = { gold: '🥇 Or', silver: '🥈 Argent', bronze1: team ? '🥉 Bronze' : '🥉 Bronze 1', bronze2: '🥉 Bronze 2' };
  const entryLabel = entry => {
    const label = `${entry.name} — ${entry.country || 'Pays non indiqué'}`;
    const duplicate = options.entries.filter(e => e.name === entry.name && e.country === entry.country).length > 1;
    return label + (duplicate ? ` (${entry.id.slice(0, 8)})` : '') + (entry.active === false ? ' · Retiré(e)' : '');
  };
  const display = (ids, slot, fallback) => {
    const entry = options?.entries.find(e => e.id === ids?.[slot]);
    return entry ? entryLabel(entry) : fallback || '—';
  };
  const refreshLeaderboard = useCallback(async () => {
    try { setLeaderboard((await API.get(`/podium/leaderboard/${tournamentId}`)).data || []); } catch { /* Keep the current ranking on transient errors. */ }
  }, [tournamentId]);

  useEffect(() => {
    if (!selectedCompetitionId) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const [opt, status, pick] = await Promise.all([
          API.get(`/podium/options/${selectedCompetitionId}`, { signal: controller.signal }),
          API.get(`/podium/competition-status/${selectedCompetitionId}`, { signal: controller.signal }),
          API.get(`/podium/${selectedCompetitionId}`, { signal: controller.signal })
        ]);
        if (controller.signal.aborted) return;
        setOptions(opt.data); setIsLocked(status.data.isLocked); setLegacy(pick.data || {}); setError('');
        const ids = { ...(pick.data.selectionIds || {}) };
        // Display legacy names without silently guessing among homonyms.
        for (const k of ['gold','silver','bronze1','bronze2']) {
          const matches = opt.data.entries.filter(e => e.name === pick.data[k]);
          if (!ids[k] && matches.length === 1) ids[k] = matches[0].id;
        }
        setSelected(ids);
        if (status.data.isLocked || user?.isAdmin) {
          const all = await API.get(`/podium/all/competition/${selectedCompetitionId}`, { signal: controller.signal });
          if (!controller.signal.aborted) setAllPredictions(all.data);
        }
      } catch (err) { if (!controller.signal.aborted) setError(err.response?.data?.error || 'Impossible de charger la liste officielle. Réessayez.'); }
    };
    load();
    const timer = setInterval(async () => {
      try {
        const status = await API.get(`/podium/competition-status/${selectedCompetitionId}`, { signal: controller.signal });
        if (!controller.signal.aborted) setIsLocked(status.data.isLocked);
      } catch { /* Do not replace a valid status with an invented one. */ }
    }, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selectedCompetitionId, user?.isAdmin]);
  useEffect(() => { refreshLeaderboard(); }, [refreshLeaderboard, selectedCompetitionId]);

  useEffect(() => {
    if (!isLocked || !selectedCompetitionId) return;
    const controller = new AbortController();
    API.get(`/podium/all/competition/${selectedCompetitionId}`, { signal: controller.signal }).then(({data})=>setAllPredictions(data)).catch(()=>{});
    return ()=>controller.abort();
  }, [isLocked, selectedCompetitionId]);

  const submit = async e => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const ids = Object.fromEntries(slots.map(k => [k, selected[k]]));
      await API.post('/podium', { competitionId: selectedCompetitionId, selectionIds: ids });
      setMessage('Pronostic enregistré avec succès !');
    } catch (err) {
      if (err.response?.status === 403) setIsLocked(true);
      setMessage(err.response?.data?.error || 'Erreur lors de l’enregistrement.');
    } finally { setBusy(false); }
  };
  const toggleLock = async () => {
    setLockBusy(true);
    try {
      const { data } = await API.put(`/podium/competition/${selectedCompetitionId}/toggle-lock`, { isLocked: !isLocked });
      setIsLocked(data.competition.isPodiumLocked); setAdminMessage(data.message);
    } catch (err) { setAdminMessage(err.response?.data?.error || 'Erreur lors du verrouillage.'); }
    finally { setLockBusy(false); }
  };
  const resolve = async () => {
    setBusy(true);
    try {
      const { data } = await API.post(`/podium/competition/${selectedCompetitionId}/resolve`);
      setAdminMessage(data.message); setIsLocked(true);
      setOptions((await API.get(`/podium/options/${selectedCompetitionId}`)).data);
      setAllPredictions((await API.get(`/podium/all/competition/${selectedCompetitionId}`)).data);
      refreshLeaderboard();
    } catch (err) { setAdminMessage(err.response?.data?.error || 'Erreur lors de la validation.'); }
    finally { setBusy(false); }
  };

  return <section id="podium" style={{ background:'var(--surface)', padding:20, borderRadius:'var(--radius)', margin:'20px 0', border:'1px solid var(--border)' }}>
    <h3>{adminOnly?"Administration du podium":"🏆 Pronostics et Classement Podium"}</h3>
    {!adminOnly&&<div style={{ display:'flex', gap:10, marginBottom:20 }}>
      <button aria-pressed={activeTab==='prediction'} onClick={()=>setActiveTab('prediction')}>🎯 Pronostics Podium</button>
      <button aria-pressed={activeTab==='leaderboard'} onClick={()=>setActiveTab('leaderboard')}>📊 Classement Pronos Podium</button>
    </div>}
    {error && <p role="alert">{error}</p>}
    {activeTab==='prediction' ? <>
      {options && <>
        <p>{team ? 'Par équipes : or, argent et un bronze, attribué au vainqueur de la petite finale.' : 'En individuel : or, argent et deux bronzes ex æquo. L’ordre des deux bronzes est indifférent.'}</p>
        <details><summary>Barème podium · jusqu’à {team ? 45 : 60} points</summary><p>15 points par médaille correcte ; 5 points si l’engagé est médaillé à une autre place. Les paliers ne se cumulent pas.</p></details>
      </>}
      {user?.isAdmin && <div style={{ padding:15, margin:'20px 0', background:'var(--warning-soft)', borderRadius:'var(--radius)' }}>
        <p>👑 ESPACE ADMIN</p>
        <button type="button" disabled={lockBusy || !options || !!options.resolvedAt || !!options.official} onClick={toggleLock}>{isLocked ? '🔓 Déverrouiller la saisie aux joueurs' : '🔒 Bloquer la saisie aux joueurs'}</button>
        <p>{options?.official ? 'Podium vérifié dans les résultats officiels :' : 'Attribution des points en attente de la finale et des résultats officiels définitifs.'}</p>
        {options?.official && <ul>{slots.map(k=><li key={k}>{labels[k]} : {display(options.official,k)}</li>)}</ul>}
        {options?.resultsSourceUrl && <p><a href={options.resultsSourceUrl} target="_blank" rel="noreferrer">Consulter Results sur FencingTimeLive</a></p>}
        <button type="button" disabled={busy || !options?.official} onClick={resolve}>{options?.resolvedAt ? 'Recalculer les points du podium officiel' : 'Valider les points du podium officiel'}</button>
        {adminMessage && <p role="status">{adminMessage}</p>}
      </div>}
      {!adminOnly&&<>{isLocked && <p>🔒 Les pronostics sont clos pour cette épreuve.</p>}
      {options ? <form onSubmit={submit} style={{ display:'grid', gap:12, maxWidth:540 }}>
        {!isLocked && <label>Rechercher un nom, prénom ou pays<input type="search" value={search} onChange={e=>setSearch(e.target.value)} /></label>}
        {slots.map(k=><label key={k}>{labels[k]}
          <select aria-label={labels[k]} required value={selected[k] || ''} disabled={isLocked || busy} onChange={e=>setSelected(prev=>({...prev,[k]:e.target.value}))} style={{ display:'block', width:'100%', marginTop:5 }}>
            <option value="">{legacy[k] && !selected[k] ? `Ancien choix : ${legacy[k]} — sélectionner l’engagé` : team ? 'Choisir une équipe' : 'Choisir un athlète'}</option>
            {options.entries.filter(entry=>Object.values(selected).includes(entry.id) || `${entry.name} ${entry.country}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())).map(entry=><option key={entry.id} value={entry.id} disabled={entry.active===false || slots.some(other=>other!==k && selected[other]===entry.id)}>{entryLabel(entry)}</option>)}
          </select>
        </label>)}
        {!isLocked && <button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Valider mon podium'}</button>}
      </form> : !error && <p>Chargement des engagés…</p>}
      {message && <p role="status">{message}</p>}
      {isLocked && <div><h4>Pronostics podium des participants</h4>{allPredictions.length ? allPredictions.map(pred=><div key={pred.id} style={{ padding:12, borderBottom:'1px solid var(--border)' }}>
        <strong>{pred.user?.name}</strong> · {pred.pointsEarned || 0} pts
        <ul>{slots.map(k=><li key={k}>{labels[k]} : {display(pred.selectionIds,k,pred[k])}</li>)}</ul>
      </div>) : <p>Aucun pronostic enregistré.</p>}</div>}
      </>}
    </> : <div><h4>Classement pronos podium</h4>{leaderboard.length ? leaderboard.map((entry,i)=><p key={entry.user.id}>{entry.rank || i+1}. {entry.user.name} — {entry.totalPoints} pts</p>) : <p>Aucun point attribué pour le moment.</p>}</div>}
  </section>;
}
