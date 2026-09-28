import {APP_URL,drawResultCard,sharePayload} from './resultPresentation';
import {useState} from 'react';
export default function TournamentShare({summary}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(null),[file,setFile]=useState(null);
 const share=async()=>{setBusy(true);setMessage('');try{
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1120;drawResultCard(canvas.getContext('2d'),summary);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error();const file=new File([blob],'mon-bilan-pronos-escrime.png',{type:'image/png'});
  setFile(file);setPreview(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(blob);});

 }catch(e){if(e.name!=='AbortError')setMessage('Partage indisponible. Réessayez depuis votre navigateur.');}finally{setBusy(false);}};
 const shareFile=async()=>{try{await navigator.share(sharePayload(summary,file));setMessage('Bilan partagé.');}catch(e){if(e.name!=='AbortError')setMessage('Utilisez Télécharger l’image et Copier le lien pour partager votre bilan.');}};
 const close=()=>{if(preview)URL.revokeObjectURL(preview);setPreview(null);setFile(null);};
 return <div className="share-result"><button className="button-secondary" disabled={busy} onClick={share}>{busy?'Préparation…':summary.complete?'Partager mon bilan final':'Partager mon bilan provisoire'}</button><small>Une image de votre bilan uniquement, sans les pronostics des autres joueurs.</small>{preview&&<section className="share-preview" aria-label="Aperçu de mon bilan"><img src={preview} alt="Votre fiche de bilan Pronos Escrime"/><div><a className="button-secondary" href={preview} download="mon-bilan-pronos-escrime.png">Télécharger l’image</a>{navigator.canShare?.({files:[file]})&&<button onClick={shareFile}>Partager l’image</button>}<button className="button-secondary" onClick={async()=>{try{await navigator.clipboard.writeText(APP_URL);setMessage("Lien de l’application copié.");}catch{setMessage(`Lien de l’application : ${APP_URL}`);}}}>Copier le lien</button><button className="button-link" onClick={close}>Fermer l’aperçu</button></div></section>}{message&&<p role="status">{message}</p>}</div>;
}
