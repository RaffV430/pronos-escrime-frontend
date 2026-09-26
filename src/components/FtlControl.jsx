import {useEffect,useRef,useState} from 'react';
import API from '../api';
export default function FtlControl({competitionId,onRefresh}){
 const [busy,setBusy]=useState(false),[status,setStatus]=useState(null),[error,setError]=useState(''),[now,setNow]=useState(()=>Date.now());
 const pending=useRef(false);
 useEffect(()=>{const c=new AbortController();API.get(`/matches/sync-ftl/${competitionId}`,{signal:c.signal}).then(r=>setStatus(r.data)).catch(()=>{});const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{c.abort();clearInterval(timer);};},[competitionId]);
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
 return <section className="feature-panel" aria-busy={busy}><h3>Résultats officiels</h3><p>Contrôler le tableau d’élimination de cette épreuve, importer les nouvelles rencontres et les résultats publiés, puis recalculer les points. Le podium est vérifié dans « Results » après la finale et la petite finale par équipes.</p><p>Contrôle manuel uniquement · réservé aux administrateurs · deux minutes entre deux demandes. Les résultats de poules ne sont pas importés par ce bouton.</p><button onClick={run} disabled={busy||remaining>0}>{busy?'Contrôle en cours…':remaining>0?`Nouveau contrôle dans ${remaining} s`:'Actualiser depuis FencingTimeLive'}</button>{busy&&<p role="status">Lecture de la source officielle. Cela peut prendre une minute.</p>}{error&&<p role="alert">{error}</p>}{status?.last&&<div role="status"><p>Dernier contrôle : {new Date(status.last.at).toLocaleString('fr-FR')}</p>{status.last.success?<><p>{summary.created} nouvelle(s) rencontre(s) · {summary.results} résultat(s) importé(s) · {summary.corrections} correction(s) · {summary.pointsUpdated} pronostic(s) recalculé(s).</p><p>{summary.podium?'Podium officiel vérifié et points attribués.':'Podium en attente du classement final vérifiable.'}</p>{summary.warnings?.map((w,i)=><p key={i}>{w}</p>)}</>:<p>Contrôle non abouti : {summary?.error}</p>}</div>}</section>;
}
