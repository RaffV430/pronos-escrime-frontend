import {useEffect,useState} from 'react';
import API from '../api';
export default function ResultFreshness({competitionId}){
 const [data,setData]=useState(null),[failed,setFailed]=useState(false),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const c=new AbortController();setData(null);const read=()=>{setNow(Date.now());API.get(`/matches/freshness/${competitionId}`,{signal:c.signal}).then(r=>{setData(r.data);setFailed(false);}).catch(()=>{if(!c.signal.aborted)setFailed(true);});};read();const timer=setInterval(read,30000);return()=>{c.abort();clearInterval(timer);};},[competitionId]);
 const label=failed?'Vérification indisponible':({COMPLETE:'Résultats finalisés',RUNNING:'Contrôle en cours',DELAYED:'Synchronisation à vérifier',SCHEDULED:'Épreuve à venir',CURRENT:'Dernier contrôle réussi',UNKNOWN:'En attente du premier contrôle'}[data?.state]||'Lecture du suivi…');
 const minutes=data?.checkedAt?Math.max(0,Math.floor((now-Date.parse(data.checkedAt))/60000)):null;
 return <aside className={`result-freshness ${failed||data?.state==='DELAYED'?'is-delayed':''}`} aria-label="Fraîcheur des résultats"><strong>{label}</strong><span>{minutes!==null?(minutes<1?'Vérifié il y a moins d’une minute':minutes<60?`Vérifié il y a ${minutes} min`:`Dernière vérification : ${new Date(data.checkedAt).toLocaleString('fr-FR')}`):'Les résultats dépendent de leur publication officielle.'}</span>{data?.state!=='COMPLETE'&&data?.nextAt&&<small>Prochain contrôle prévu : {new Date(data.nextAt).toLocaleString('fr-FR')}</small>}</aside>;
}
