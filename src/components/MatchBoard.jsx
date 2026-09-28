import {roundLabel} from './matchPresentation';
import {useEffect,useRef,useState} from 'react';
import API from '../api';
import useLocalDraft,{draftKey} from './useLocalDraft';
import DraftNotice from './DraftNotice';
import MatchTiming from './MatchTiming';
import {groupMatches,isMatchClosed,validateScores} from './matchPresentation';

export default function MatchBoard({matches,userId,competitionId,now,ready,error,onRefresh,onDirtyChange,focusTarget,onPreviewSave,onPreviewRemove}) {
 const deepLink=new URLSearchParams(location.search);
 const linkedIds=Number(deepLink.get('event'))===Number(competitionId)?(deepLink.get('matches')||'').split(',').map(Number).filter(n=>Number.isSafeInteger(n)&&n>0):[];
 const [linkedNew,setLinkedNew]=useState(linkedIds);
 const [drafts,setDrafts]=useState({}),[messages,setMessages]=useState({}),[busy,setBusy]=useState(false),[filter,setFilter]=useState(linkedIds.length?'Nouveaux':'Tous'),[view,setView]=useState('Liste');
 const localDraft=useLocalDraft(draftKey(userId,competitionId,'matches'));
 const saveDrafts=update=>setDrafts(old=>{const next=typeof update==='function'?update(old):update;localDraft.persist(Object.keys(next).length?next:null);return next;});
 const seenKey=`pronos:seen-matches:${userId}:${competitionId}`;
 const [seen,setSeen]=useState(()=>{try{return JSON.parse(localStorage.getItem(seenKey)||'null');}catch{return null;}});
 useEffect(()=>{if(ready&&seen===null){const ids=matches.map(m=>m.id);setSeen(ids);try{localStorage.setItem(seenKey,JSON.stringify(ids));}catch{/* Optional device preference. */}}},[ready,seen,matches,seenKey]);
 const newMatches=matches.filter(m=>linkedNew.includes(m.id)||(seen!==null&&!seen.includes(m.id)));
 const showNew=()=>{setFilter('Nouveaux');};
 const markSeen=()=>{setLinkedNew([]);const ids=matches.map(m=>m.id);setSeen(ids);try{localStorage.setItem(seenKey,JSON.stringify(ids));}catch{/* Optional device preference. */}setFilter('Tous');};
 useEffect(()=>{if(!focusTarget)return;setFilter('Tous');const timer=setTimeout(()=>{const el=document.getElementById(`match-${focusTarget.id}`);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.focus({preventScroll:true});},50);return()=>clearTimeout(timer);},[focusTarget]);
 const saving=useRef(false);
 const valid=matches.filter(m=>m.player1?.trim()&&m.player2?.trim()&&m.player1!=='En attente...'&&m.player2!=='En attente...');
 const mine=m=>m.predictions?.find(p=>p.userId===userId);
 const dirty=Object.keys(drafts).length>0;
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false)},[dirty,onDirtyChange]);
 useEffect(()=>{const leave=e=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave)},[dirty]);
 const values=m=>({score1:mine(m)?.predictedScore1??'',score2:mine(m)?.predictedScore2??'',...drafts[m.id]});
 const message=(id,text,failed=false)=>setMessages(old=>({...old,[id]:{text,failed}}));
 const save=async(ids)=>{
  if(saving.current)return;
  saving.current=true;setBusy(true);
  try {
   for(const id of ids){
    const m=valid.find(m=>m.id===Number(id));if(!m)continue;
    const v=values(m),invalid=validateScores(v,m.maxScore||15);
    if(invalid){message(id,invalid,true);continue}
    if(!ready||error||isMatchClosed(m,Date.now())){message(id,'Le match est clos ou sa disponibilité ne peut pas être vérifiée. Votre saisie est conservée.',true);continue}
    try{if(onPreviewSave)await onPreviewSave(id,{predictedScore1:Number(v.score1),predictedScore2:Number(v.score2)});else await API.post(`/matches/${id}/predict`,{predictedScore1:Number(v.score1),predictedScore2:Number(v.score2)});await onRefresh();saveDrafts(old=>{const next={...old};delete next[id];return next});message(id,'Pronostic enregistré.');}
    catch(e){message(id,e.response?.data?.error||'Enregistrement impossible. Votre saisie est conservée.',true)}
   }
  }finally{saving.current=false;setBusy(false)}
 };
 const remove=async(m)=>{if(saving.current)return;saving.current=true;setBusy(true);try{if(onPreviewRemove)await onPreviewRemove(m.id);else await API.delete(`/matches/${m.id}/predict`);await onRefresh();saveDrafts(old=>{const next={...old};delete next[m.id];return next});message(m.id,'Pronostic supprimé.')}catch(e){message(m.id,e.response?.data?.error||'Suppression impossible.',true)}finally{saving.current=false;setBusy(false)}};
 const visible=m=>filter==='Nouveaux'?newMatches.some(n=>n.id===m.id):filter==='À compléter'?!mine(m)&&!isMatchClosed(m,now):filter==='Ferment bientôt'?!isMatchClosed(m,now)&&m.closesAt&&Date.parse(m.closesAt)-now<=3600000:filter==='Résultats publiés'?m.isFinished:true;
 const groups=groupMatches(valid),next=()=>{const target=valid.find(m=>!mine(m)&&!isMatchClosed(m,now));setFilter('À compléter');if(target)setTimeout(()=>document.getElementById(`input-${target.id}-1`)?.focus(),0)};
 const checked=[...new Set(valid.map(m=>m.sourceCheckedAt).filter(Boolean))];
 const card=m=>{const p=mine(m),v=values(m),closed=isMatchClosed(m,now),status=!ready||error?'Vérification…':m.isFinished?'Résultat publié':closed?'Clos':drafts[m.id]?'Non enregistré':p?'Enregistré':'À compléter';return <article id={`match-${m.id}`} tabIndex={-1} className={`match-card ${focusTarget?.id===m.id?'match-target':''}`} key={m.id}>
  <div className="match-meta"><span>{m.sourceKey?`Match ${m.sourceKey.split(':').pop()}`:`#${m.id}`} · {roundLabel(m.round)}</span><span className={`status-pill ${p&&!drafts[m.id]?'saved':''}`}>{status}</span></div>
  {[m.player1,m.player2].map((name,i)=><label className="opponent-row" key={i}><strong>{name}</strong><input id={`input-${m.id}-${i+1}`} aria-label={`Score prévu de ${name}`} inputMode="numeric" type="number" min="0" max={m.maxScore||15} step="1" placeholder="—" value={v[`score${i+1}`]} disabled={closed||busy||!ready||!!error} onChange={e=>saveDrafts(old=>({...old,[m.id]:{...values(m),[`score${i+1}`]:e.target.value}}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(i===0)document.getElementById(`input-${m.id}-2`)?.focus();else save([m.id]);}}}/></label>)}
  {m.isFinished?<div className="official-result"><p>{m.resultType==='MEDICAL_WITHDRAWAL'?`Retrait médical · Victoire ${m.winnerName}`:`Résultat : ${m.score1} – ${m.score2}`}</p>{p&&<strong>{p.pointsEarned??0} {(p.pointsEarned??0)===1?'point':'points'}</strong>}</div>:<MatchTiming match={m} now={now} hideChecked={checked.length===1}/>}
  {m.syncIssue&&<p role="alert">{m.syncIssue}</p>}{!m.isFinished&&<div className="match-actions"><button disabled={closed||busy||!drafts[m.id]||!ready||!!error} onClick={()=>save([m.id])}>{busy?'Enregistrement…':'Enregistrer'}</button>{p&&<button className="button-link" disabled={closed||busy||!ready||!!error} onClick={()=>remove(m)}>Supprimer</button>}{drafts[m.id]&&<button className="button-link" disabled={busy} onClick={()=>saveDrafts(old=>{const next={...old};delete next[m.id];return next})}>Annuler la saisie</button>}</div>}
  {messages[m.id]&&<p role={messages[m.id].failed?'alert':'status'} className={messages[m.id].failed?'pool-error':'pool-saved'}>{messages[m.id].text}</p>}
 </article>};
 return <section className="match-board" aria-label="Tableau d’élimination directe">
 <>{newMatches.length>0&&<aside className="new-matches"><strong>{newMatches.length} nouvelle(s) rencontre(s) dans cette épreuve</strong> <button onClick={showNew}>Voir les nouvelles rencontres</button> <button className="button-link" onClick={markSeen}>Marquer comme vues</button></aside>}</>{ready&&!error&&<DraftNotice draft={localDraft} onRestore={value=>saveDrafts(Object.fromEntries(Object.entries(value).filter(([id])=>valid.some(m=>String(m.id)===id&&!isMatchClosed(m,now)))))} />}
 {!ready&&!error&&<p role="status">Vérification des matchs…</p>}{error&&<p role="alert">{error} <button onClick={onRefresh}>Réessayer</button></p>}
 {ready&&<><div className="overview"><div><strong>{valid.filter(m=>mine(m)).length} / {valid.length}</strong><span>pronostics enregistrés</span></div><div><strong>{valid.filter(m=>!mine(m)&&!isMatchClosed(m,now)).length}</strong><span>à compléter</span></div><div><strong>Clôture par tour</strong><span>Heure prévue, au moins 10 min après le dernier résultat du tour précédent</span></div></div><div className="board-toolbar"><div className="filter-row">{['Tous','À compléter','Ferment bientôt','Résultats publiés'].map(x=><button key={x} aria-pressed={filter===x} onClick={()=>setFilter(x)}>{x}</button>)}</div><div className="filter-row">{['Liste','Arbre'].map(x=><button key={x} aria-pressed={view===x} onClick={()=>setView(x)}>{x}</button>)}</div></div>
 <div className="feature-heading"><p className="muted">{checked.length===1?`Dernière vérification officielle : ${new Date(checked[0]).toLocaleString('fr-FR')}`:'Les dates de vérification figurent sur les rencontres.'}</p><button className="button-link" onClick={next} disabled={!valid.some(m=>!mine(m)&&!isMatchClosed(m,now))}>Pronostic suivant →</button></div>
 {view==='Arbre'&&<p className="muted">Tours du tableau · faites défiler horizontalement sur mobile. Seules les rencontres avec deux adversaires connus sont affichées ; le numéro officiel conserve leur position.</p>}
 <div className={view==='Arbre'?'bracket-board':'rounds'}>{groups.filter(g=>g.items.some(visible)).map(({round,items})=><section className="round-column" key={round}><h2>{roundLabel(round)} <span className="round-count">{items.filter(m=>mine(m)).length}/{items.length}</span></h2><div className={view==='Arbre'?'bracket-cards':'match-grid'}>{items.filter(visible).map(card)}</div></section>)}</div>
 {!valid.some(visible)&&<p className="pool-empty">{valid.length?'Aucune rencontre ne correspond à ce filtre.':'Les rencontres apparaîtront après publication et import du tableau officiel.'}</p>}
 </>}{dirty&&<div className="save-dock"><span>{Object.keys(drafts).length} saisie(s) non enregistrée(s)</span><button disabled={busy||!ready||!!error} onClick={()=>save(Object.keys(drafts))}>{busy?'Enregistrement…':'Tout enregistrer'}</button></div>}
 </section>;
}
