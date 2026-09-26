import { useCallback, useEffect, useState } from 'react';
import ScoringRules from './ScoringRules';
import API from '../api';
import './PoolPredictions.css';

const message = error => error.response?.data?.error || 'Connexion impossible. Réessayez.';
const signed = value => value > 0 ? `+${value}` : String(value);

function PredictionRow({ pool, fencer, closed, onRefresh }) {
  const [wins, setWins] = useState(fencer.prediction?.wins ?? '');
  const [indicator, setIndicator] = useState(fencer.prediction?.indicator ?? '');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const bouts = pool.fencers.length - 1;
  const losses = wins === '' ? '' : bouts - Number(wins);
  const minimum = wins === '' ? -5 * bouts : Number(wins) - 5 * losses;
  const maximum = wins === '' ? 5 * bouts : 5 * Number(wins) - losses;
  async function save(event) {
    event.preventDefault();
    setBusy(true); setFeedback('');
    try {
      await API.put(`/pools/${pool.id}/fencers/${fencer.id}/prediction`, { wins: Number(wins), losses, indicator: Number(indicator) });
      setFeedback('Pronostic enregistré.');
      onRefresh();
    } catch (error) { setFeedback(message(error)); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setFeedback('');
    try {
      await API.delete(`/pools/${pool.id}/fencers/${fencer.id}/prediction`);
      setWins(''); setIndicator(''); setFeedback('Pronostic supprimé.'); onRefresh();
    } catch (error) { setFeedback(message(error)); }
    finally { setBusy(false); }
  }
  const formId = `pool-prediction-${pool.id}-${fencer.id}`;
  const lockReason = pool.isFinal ? 'Résultats publiés' : fencer.firstResultAt ? 'Premier résultat publié' : pool.isClosed ? 'Poule fermée' : closed ? (pool.lockMode === 'FIRST_RESULT' ? 'Vérification en attente' : 'Clôture atteinte') : 'Pronostic ouvert';
  const resultCell = (predicted, actual, isIndicator = false) => <><span className="pool-predicted">{predicted == null ? '—' : isIndicator ? signed(predicted) : predicted}</span><strong className="pool-actual">{actual == null ? '—' : isIndicator ? signed(actual) : actual}</strong></>;
  return <tr id={`pool-${fencer.id}`} className={closed ? 'pool-table-row is-closed' : 'pool-table-row'}>
    <th scope="row" className="pool-name-cell"><span className="pool-position">{fencer.position}</span> <span>{fencer.name}</span></th>
    <td><div className="pool-fencer-info">
      <span className="pool-country" title="Nationalité · code ISO à trois lettres">{fencer.countryCode || '—'}</span>
      {pool.rankingSystem && <span className="pool-ranking" title="Classement de la liste d’engagement de l’épreuve">{pool.rankingSystem === 'NATIONAL' ? 'National' : pool.rankingSystem} · {Number.isInteger(fencer.ranking) && fencer.ranking > 0 ? fencer.ranking : 'non renseigné'}</span>}
    </div></td>
    <td className="pool-number-cell">{pool.isFinal ? resultCell(fencer.prediction?.wins, fencer.wins) : <input form={formId} aria-label={`Victoires de ${fencer.name}`} type="number" min="0" max={bouts} step="1" required value={wins} onChange={e => setWins(e.target.value)} disabled={closed || busy} />}</td>
    <td className="pool-number-cell">{pool.isFinal ? resultCell(fencer.prediction?.losses, fencer.losses) : <input aria-label={`Défaites de ${fencer.name} (calcul automatique)`} title="Calcul automatique" type="number" value={losses} readOnly tabIndex={-1} />}</td>
    <td className="pool-number-cell">{pool.isFinal ? resultCell(fencer.prediction?.indicator, fencer.indicator, true) : <input form={formId} aria-label={`Indice de ${fencer.name}`} type="number" min={minimum} max={maximum} step="1" required placeholder="+8" value={indicator} onChange={e => setIndicator(e.target.value)} disabled={closed || busy} />}</td>
    {pool.isFinal && <td className="pool-points-cell">{fencer.comparison ? <strong title={`Victoires : ${fencer.comparison.points.winsPoints} pts ; indice : ${fencer.comparison.points.indicatorPoints} pts`}>{fencer.comparison.points.total} / 8</strong> : '—'}</td>}
    <td className="pool-state-cell">
      <span className="pool-row-state" title={lockReason}>{closed ? '🔒 ' : ''}{lockReason}</span>
      {!pool.isFinal && <form id={formId} onSubmit={save} className="pool-row-actions">{!closed && <><button disabled={busy} type="submit" aria-label={`Enregistrer le pronostic de ${fencer.name}`}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>{fencer.prediction && <button disabled={busy} type="button" className="pool-secondary" aria-label={`Supprimer le pronostic de ${fencer.name}`} onClick={remove}>Supprimer</button>}</>}</form>}
      {fencer.prediction && !pool.isFinal && <small className="pool-saved">Enregistré : {fencer.prediction.wins} V · {fencer.prediction.losses} D · {signed(fencer.prediction.indicator)}</small>}
      {closed && !fencer.prediction && <small>Aucun pronostic enregistré</small>}
      <span role="status" className="pool-row-feedback">{feedback}</span>
    </td>
  </tr>;
}

function PoolAdmin({ pool, closed, onRefresh }) {
  const [results, setResults] = useState(() => Object.fromEntries(pool.fencers.map(f => [f.id, { wins: f.wins ?? '', indicator: f.indicator ?? '' }])));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const bouts = pool.fencers.length - 1;
  async function close() {
    setBusy(true); setFeedback('');
    try { await API.post(`/pools/${pool.id}/close`); onRefresh(); }
    catch (error) { setFeedback(message(error)); }
    finally { setBusy(false); }
  }
  async function publish(event) {
    event.preventDefault(); setBusy(true); setFeedback('');
    try {
      const response = await API.put(`/pools/${pool.id}/results`, { results: pool.fencers.map(f => ({
        fencerId: f.id, wins: Number(results[f.id].wins), losses: bouts - Number(results[f.id].wins), indicator: Number(results[f.id].indicator),
      })) });
      setFeedback(response.data.message); onRefresh();
    } catch (error) { setFeedback(message(error)); }
    finally { setBusy(false); }
  }
  return <details className="pool-admin"><summary>Administration · {pool.name}</summary>
    {!closed ? <><p>La fermeture manuelle est définitive. Fermez les pronostics avant de saisir les résultats.</p><button disabled={busy} onClick={close}>Fermer les pronostics</button></> : <form onSubmit={publish}>
      <p>Résultats complets d’une poule en 5 touches, sans abandon. Une correction remplace les points précédents.</p>
      {pool.fencers.map(f => <div className="pool-official" key={f.id}>
        <strong>{f.name}</strong>
        <label>Victoires<input aria-label={`Victoires officielles de ${f.name}`} type="number" min="0" max={bouts} required value={results[f.id].wins} onChange={e => setResults(prev => ({ ...prev, [f.id]: { ...prev[f.id], wins: e.target.value } }))} /></label>
        <label>Indice<input aria-label={`Indice officiel de ${f.name}`} type="number" min={-5 * bouts} max={5 * bouts} required value={results[f.id].indicator} onChange={e => setResults(prev => ({ ...prev, [f.id]: { ...prev[f.id], indicator: e.target.value } }))} /></label>
      </div>)}
      <button disabled={busy}>{busy ? 'Publication…' : pool.isFinal ? 'Corriger les résultats et recalculer' : 'Publier les résultats et calculer les points'}</button>
    </form>}
    <p role="status">{feedback}</p>
  </details>;
}

function CreatePool({ competitionId, onRefresh }) {
  const [name, setName] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [lockMode, setLockMode] = useState('FIRST_RESULT');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePoolNumber, setSourcePoolNumber] = useState('');
  const [rankingSystem, setRankingSystem] = useState('');
  const [roster, setRoster] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  async function create(event) {
    event.preventDefault(); setFeedback(''); setBusy(true);
    try {
      await API.post('/pools', { competitionId, name, lockMode, rankingSystem: rankingSystem || null, ...(lockMode === 'FIRST_RESULT' ? { sourceUrl, sourcePoolNumber: Number(sourcePoolNumber) } : { closesAt: new Date(closesAt).toISOString() }), fencers: roster.split('\n').map(n => n.trim()).filter(Boolean) });
      setName(''); setRoster(''); setFeedback('Poule créée.'); onRefresh();
    } catch (error) { setFeedback(message(error)); }
    finally { setBusy(false); }
  }
  return <details className="pool-admin"><summary>Créer une poule</summary><form onSubmit={create} className="pool-create">
    <p>Ajoutez de 2 à 8 tireurs, un par ligne. La composition et le mode de clôture ne seront plus modifiables après création.</p>
    <label>Nom de la poule<input required maxLength="100" placeholder="Poule 1" value={name} onChange={e => setName(e.target.value)} /></label>
    <label>Blocage des pronostics<select value={lockMode} onChange={e => setLockMode(e.target.value)}><option value="FIRST_RESULT">Premier résultat de chaque tireur sur FencingTimeLive</option><option value="TIME">Horaire fixe pour toute la poule</option></select></label>
    {lockMode === 'FIRST_RESULT' ? <><label>Lien des poules FencingTimeLive<input required type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://www.fencingtimelive.com/pools/scores/…" /></label><label>Numéro de poule sur FencingTimeLive<input required type="number" min="1" max="1000" value={sourcePoolNumber} onChange={e => setSourcePoolNumber(e.target.value)} /></label><p>Chaque tireur est bloqué indépendamment au premier résultat détecté, victoire ou défaite. Contrôle chaque minute. En cas de contrôle indisponible, les saisies sont temporairement suspendues.</p></> : <label>Clôture des pronostics<input required type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} /><small>Heure locale de votre appareil ({Intl.DateTimeFormat().resolvedOptions().timeZone}), à fixer avant le début de la poule.</small></label>}
    <label>Classement de référence<select value={rankingSystem} onChange={e => setRankingSystem(e.target.value)}><option value="">Non précisé</option><option value="FIE">FIE · Coupe du monde, Mondiaux, JO</option><option value="EFC">EFC · Circuit européen</option><option value="NATIONAL">National · Épreuve nationale</option></select><small>Utiliser le classement de la liste d’engagement, dans la catégorie et l’arme de l’épreuve.</small></label>
    <label>Tireurs<textarea required rows="7" placeholder={'Prénom Nom\nPrénom Nom'} value={roster} onChange={e => setRoster(e.target.value)} /></label>
    <button disabled={busy}>{busy ? 'Création…' : 'Créer la poule'}</button><p role="status">{feedback}</p>
  </form></details>;
}

function PoolList({ competitionId, user }) {
  const [pools, setPools] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({ pending: true, published: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const reload = useCallback(() => setRefresh(n => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    API.get(`/pools?competitionId=${competitionId}`, { signal: controller.signal })
      .then(res => { if (!controller.signal.aborted) setPools(res.data); })
      .catch(err => { if (!controller.signal.aborted) setError(message(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [competitionId, refresh]);
  useEffect(() => {
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>
    <div className="pool-toolbar"><button className="pool-secondary" onClick={reload} disabled={loading}>Actualiser</button><span role="status">{loading ? 'Chargement des poules…' : `${pools.length} poule(s)`}</span></div>
    {error && <p role="alert" className="pool-error">{error}</p>}
    {!loading && !error && pools.length === 0 && <p className="pool-empty">Aucune poule disponible pour cette épreuve. Les tireurs apparaîtront dès la création des poules par l’administrateur.</p>}
    {!loading && !error && pools.length > 0 && [
      { key: 'pending', title: 'Poules à compléter', items: pools.filter(pool => !pool.isFinal).sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })), empty: 'Toutes les poules disponibles ont un résultat publié.' },
      { key: 'published', title: 'Résultats publiés', items: pools.filter(pool => pool.isFinal).sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })), empty: 'Aucun résultat de poule publié pour le moment.' },
    ].map(group => <details className="pool-group" key={group.key} open={expandedGroups[group.key]} onToggle={event => { const open = event.currentTarget.open; setExpandedGroups(previous => previous[group.key] === open ? previous : { ...previous, [group.key]: open }); }}>
      <summary><h3 className="pool-group-title">{group.title} <span className="pool-group-count">{group.items.length}</span></h3></summary>
      {group.items.length === 0 && <p className="pool-empty">{group.empty}</p>}
      {group.items.map(pool => {
      const closed = pool.isClosed || (pool.lockMode !== 'FIRST_RESULT' && new Date(pool.closesAt).getTime() <= now);
      const sourcePending = pool.lockMode === 'FIRST_RESULT' && (!pool.sourceCheckedAt || now - new Date(pool.sourceCheckedAt).getTime() > 180000);
      return <article className="pool-card" key={pool.id}>
        <header><div><h3>{pool.name}</h3><p>{pool.fencers.length} tireurs · {pool.fencers.length - 1} matchs par tireur</p></div><span className={`pool-badge ${closed ? 'closed' : ''}`}>{pool.isFinal ? 'Résultats publiés' : closed ? 'Pronostics clos' : pool.lockMode === 'FIRST_RESULT' ? 'Blocage par tireur' : 'Pronostics ouverts'}</span></header>
        <p className="pool-deadline">{pool.lockMode === 'FIRST_RESULT' ? 'Clôture individuelle au premier résultat détecté sur FencingTimeLive.' : <>Clôture : {new Date(pool.closesAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</>}</p>
        {pool.rankingSourceUrl && <p className="pool-deadline"><a href={pool.rankingSourceUrl} target="_blank" rel="noreferrer">Liste d’engagement · nationalités et classements</a></p>}
        <div className="pool-table-scroll" role="region" aria-label={`Tableau de ${pool.name}`} tabIndex={0}><table className="pool-table"><caption>{pool.isFinal ? 'Pour chaque valeur : votre pronostic, puis le résultat réel en gras.' : 'Saisissez les victoires et l’indice, puis enregistrez chaque ligne. Les défaites sont calculées automatiquement.'}</caption><thead><tr><th scope="col">Tireur / tireuse</th><th scope="col">Nationalité · classement</th><th scope="col">Victoires</th><th scope="col">Défaites</th><th scope="col">Indice</th>{pool.isFinal && <th scope="col">Points</th>}<th scope="col">{pool.isFinal ? 'État' : 'Pronostic'}</th></tr></thead><tbody>{pool.fencers.map(fencer => <PredictionRow key={`${fencer.id}-${fencer.prediction?.updatedAt || 'none'}`} pool={pool} fencer={fencer} closed={pool.isFinal || closed || Boolean(fencer.firstResultAt) || sourcePending} onRefresh={reload} />)}</tbody></table></div>
        {user.isAdmin && <PoolAdmin pool={pool} closed={closed} onRefresh={reload} />}
      </article>;
      })}
    </details>)}
    {user.isAdmin && <CreatePool competitionId={competitionId} onRefresh={reload} />}
  </>;
}

export default function PoolPredictions({ selectedCompetitionId, user }) {
  return <section className="pool-section" aria-labelledby="pool-title">
    <h2 id="pool-title">Pronostics de poules</h2>
    <p>Pour chaque tireur, prévoyez son bilan et son indice : touches données − touches reçues.</p>
    <ScoringRules />
    {selectedCompetitionId ? <PoolList key={`${user.id}-${selectedCompetitionId}`} competitionId={selectedCompetitionId} user={user} /> : <p>Aucune épreuve sélectionnée.</p>}
  </section>;
}
