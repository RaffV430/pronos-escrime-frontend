import {useEffect,useRef,useState} from 'react';
import API from '../api';
export default function FtlControl({competitionId,onRefresh}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(null),[error,setError]=useState(''),[now,setNow]=useState(()=>Date.now());
 const pending=useRef(false);
 useEffect(()=>{const c=new AbortController();setStatus(null);const read=()=>API.get(`/matches/sync-ftl/${competitionId}`,{signal:c.signal}).then(r=>setStatus(r.data)).catch(()=>{});read();const poll=setInterval(read,30000);const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{c.abort();clearInterval(timer);clearInterval(poll);};},[competitionId]);
 const remaining=Math.max(0,Math.ceil((Date.parse(status?.nextAllowedAt||'')-now)/1000)||0);
 const run=async()=>{
  if(pending.current)return;pending.current=true;setBusy(true);setError('');
  try{
   const {data}=await API.post('/matches/sync-ftl',{competitionId},{timeout:115000});
   setStatus({last:{at:data.checkedAt,success:true,summary:data},nextAllowedAt:new Date(Date.now()+120000).toISOString()});
   try{await onRefresh();}catch{setError('Contrôle enregistré. Rechargez la page pour afficher les changements.');}
  }catch(e){setError(e.response?.data?.error||'Connexion interrompue. Le contrôle peut encore se terminer : consultez son bilan avant de relancer.');}
  finally{try{const {data}=await API.get(`/matches/sync-ftl/${competitionId}`);setStatus(data);}catch{/* Keep the last known result. */}pending.current=false;setBusy(false);setNow(Date.now());}
 };
 const summary=status?.last?.summary;
 return <section className="ftl-compact" aria-busy={busy}><div className="feature-heading"><div><strong>Résultats officiels</strong><small>{status?.automatic?.enabled?(status.automatic.status==='COMPLETE'?'Suivi automatique terminé · résultats finalisés':'Suivi automatique côté serveur activé'):'Contrôle manuel de cette épreuve'}</small><small>{status?.last?`Dernier contrôle : ${new Date(status.last.at).toLocaleString('fr-FR')}`:'Aucun contrôle enregistré'}</small></div><button onClick={run} disabled={busy||remaining>0}>{busy?'Contrôle en cours…':remaining>0?`Disponible dans ${remaining} s`:'Actualiser les résultats'}</button></div>{busy&&<p role="status">Lecture de FencingTimeLive…</p>}{error&&<p role="alert">{error}</p>}<details><summary>Détails du contrôle</summary><p>Poules, tableau et podium officiel après la finale.</p><p>Contrôle manuel réservé aux administrateurs. Deux minutes entre les demandes pour une même épreuve. Les autres épreuves restent indépendantes.</p>{status?.last&&(status.last.success?<><p>{summary.cancelled||0} affiche(s) annulée(s) · {summary.created||0} nouvelle(s) rencontre(s) · {summary.results||0} résultat(s) · {summary.corrections||0} correction(s) · {summary.pointsUpdated||0} pronostic(s) recalculé(s).</p>{summary.pools&&<p>{summary.pools.checked} poule(s) vérifiée(s) · {summary.pools.finalized} finalisée(s) · {summary.pools.locks} nouveau(x) blocage(s) individuel(s).</p>}<p>{summary.podium?'Podium officiel vérifié.':'Podium en attente du classement final vérifiable.'}</p>{summary.warnings?.map((w,i)=><p key={i}>{w}</p>)}</>:<p role="alert">Contrôle non abouti : {summary?.error}</p>)}</details></section>;
}
