import {useEffect,useState} from 'react';
import API from '../api';
import {pushSupport,applicationKey,disableThisDevice} from '../lib/notifications';
export default function NotificationSettings({userId}){
 const [open,setOpen]=useState(false),[choices,setChoices]=useState([]),[config,setConfig]=useState(null),[registration,setRegistration]=useState(null),[sub,setSub]=useState(null),[enabled,setEnabled]=useState(false),[tournaments,setTournaments]=useState([]),[events,setEvents]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[ready,setReady]=useState(false);
 const unsupported=pushSupport();
 useEffect(()=>{
  if(!open)return;let cancelled=false;setReady(false);setMessage('');
  (async()=>{try{
   const [settings,items]=await Promise.all([API.get('/notifications/config'),API.get('/notifications/choices')]);
   const reg=unsupported?null:await navigator.serviceWorker.register('/sw.js');
   const current=reg&&await reg.pushManager.getSubscription();
   const status=current?(await API.post('/notifications/status',{endpoint:current.endpoint})).data:null;
   if(cancelled)return;setConfig(settings.data);setChoices(items.data);setRegistration(reg);setSub(current);setEnabled(Boolean(status?.enabled));setTournaments(status?.tournamentIds||[]);setEvents(status?.competitionIds||[]);setReady(true);
  }catch{if(!cancelled)setMessage('Impossible de charger vos préférences. Fermez puis rouvrez ce panneau.');}})();return()=>{cancelled=true;};
 },[open,userId,unsupported]);
 const toggle=(setter,id,checked)=>setter(old=>checked?[...new Set([...old,id])]:old.filter(x=>x!==id));
 const activate=async()=>{
  // Ask during the user's click, before any network wait (required by iOS).
  const permission=Notification.permission==='granted'?Promise.resolve('granted'):Notification.requestPermission();
  setBusy(true);setMessage('');
  try{if(await permission!=='granted')throw Error('Autorisation refusée. Vous pouvez la modifier dans les réglages de notifications du navigateur ou de l’application.');
   await navigator.serviceWorker.ready;
   const current=sub||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(config.publicKey)});setSub(current);
   await API.post('/notifications/subscribe',{subscription:current.toJSON(),tournamentIds:tournaments,competitionIds:events});setEnabled(true);setMessage('Préférences enregistrées sur cet appareil. Vous serez averti après l’import de nouveaux matchs encore ouverts.');
  }catch(e){setMessage(e.response?.data?.error||e.message||'Activation impossible. Réessayez.');}finally{setBusy(false);}
 };
 const disable=async()=>{setBusy(true);try{await disableThisDevice();setSub(null);setEnabled(false);setMessage('Notifications désactivées sur cet appareil.');}catch{setMessage('Désactivation non confirmée. Réessayez.');}finally{setBusy(false);}};
 const test=async()=>{setBusy(true);try{await API.post('/notifications/test',{endpoint:sub.endpoint});setMessage('Notification de test envoyée. Vérifiez le centre de notifications de votre appareil.');}catch(e){setMessage(e.response?.data?.error||'Test indisponible.');}finally{setBusy(false);}};
 return <details className="feature-panel notification-settings" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Notifications des nouveaux matchs</summary>{open&&<><p>Choisissez les tournois ou les épreuves à suivre sur cet appareil. Une alerte regroupe les nouveaux matchs encore ouverts après un contrôle manuel des résultats.</p>{unsupported&&<p className="notice">{unsupported}</p>}{!ready&&!message&&<p role="status">Chargement des préférences…</p>}{ready&&<>{!config?.available&&<p>Les notifications sont en cours de configuration.</p>}<p className="status-pill">{enabled?'Activées sur cet appareil':'Désactivées sur cet appareil'}</p><div className="notification-choices">{choices.map(t=><fieldset key={t.id}><legend>{t.name}</legend><label className="check-row"><input type="checkbox" disabled={busy} checked={tournaments.includes(t.id)} onChange={e=>toggle(setTournaments,t.id,e.target.checked)}/> Tout le tournoi, y compris ses futures épreuves</label>{t.competitions.map(c=><label className="check-row" key={c.id}><input type="checkbox" disabled={busy||tournaments.includes(t.id)} checked={tournaments.includes(t.id)||events.includes(c.id)} onChange={e=>toggle(setEvents,c.id,e.target.checked)}/>{c.name}</label>)}</fieldset>)}</div><div className="notification-actions"><button disabled={busy||!!unsupported||!config?.available||(!tournaments.length&&!events.length)} onClick={activate}>{enabled?'Enregistrer mes choix':'Activer sur cet appareil'}</button>{enabled&&<><button className="button-secondary" disabled={busy} onClick={test}>Tester une notification</button><button className="button-link" disabled={busy} onClick={disable}>Désactiver sur cet appareil</button></>}{sub&&!enabled&&<button className="button-link" disabled={busy} onClick={disable}>Réinitialiser l’abonnement de cet appareil</button>}</div></>}{message&&<p role="status">{message}</p>}<p className="muted">Aucun envoi avant votre accord. La déconnexion désactive les alertes sur cet appareil. Les notifications peuvent être retardées par les réglages du téléphone.</p></>}</details>;
}
