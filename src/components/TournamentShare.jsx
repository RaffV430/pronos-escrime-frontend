import {roundLabel} from './matchPresentation';
import {useState} from 'react';
export default function TournamentShare({summary}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(null),[file,setFile]=useState(null);
 const share=async()=>{setBusy(true);setMessage('');try{
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1200;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#eef3fa';ctx.fillRect(0,0,1080,1200);ctx.fillStyle='#17365b';ctx.fillRect(0,0,1080,210);ctx.fillStyle='#fff';ctx.font='bold 48px sans-serif';ctx.fillText('PRONOS ESCRIME',64,110);
  const line=(text,y,size=36)=>{ctx.fillStyle='#17365b';ctx.font=`${size}px sans-serif`;const words=String(text).split(/\s+/);let row='';for(const word of words){if(ctx.measureText(row+word).width>930){ctx.fillText(row,64,y);y+=size+14;row='';}row+=word+' ';}ctx.fillText(row,64,y);return y+size+25;};
  let y=line(summary.complete?'MON BILAN FINAL':'MON BILAN PROVISOIRE',285,40);y=line(summary.tournamentName,y,34);y=line(`${summary.ranking?.name||'Mon résultat'}`,y,38);y+=20;
  for(const text of [`${summary.ranking?.totalPoints||0} points`,`Classement : ${summary.ranking?.rank||'—'} / ${summary.players}`,`${summary.exact} scores exacts`,`${summary.accuracy??0} % de bons vainqueurs`])y=line(text,y,40);
  if(summary.bestRound)y=line(`Meilleur tour : ${roundLabel(summary.bestRound.round)} · ${summary.bestRound.points} points`,y,30);
  line(new Date().toLocaleDateString('fr-FR'),1120,25);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error();const file=new File([blob],'mon-bilan-pronos-escrime.png',{type:'image/png'});
  setFile(file);setPreview(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(blob);});

 }catch(e){if(e.name!=='AbortError')setMessage('Partage indisponible. Réessayez depuis votre navigateur.');}finally{setBusy(false);}};
 const shareFile=async()=>{try{await navigator.share({files:[file],title:'Mon bilan Pronos Escrime'});setMessage('Bilan partagé.');}catch(e){if(e.name!=='AbortError')setMessage('Utilisez Télécharger l’image pour la partager.');}};
 const close=()=>{if(preview)URL.revokeObjectURL(preview);setPreview(null);setFile(null);};
 return <div className="share-result"><button className="button-secondary" disabled={busy} onClick={share}>{busy?'Préparation…':summary.complete?'Partager mon bilan final':'Partager mon bilan provisoire'}</button><small>Une image de votre bilan uniquement, sans les pronostics des autres joueurs.</small>{preview&&<section className="share-preview" aria-label="Aperçu de mon bilan"><img src={preview} alt="Votre fiche de bilan Pronos Escrime"/><div><a className="button-secondary" href={preview} download="mon-bilan-pronos-escrime.png">Télécharger l’image</a>{navigator.canShare?.({files:[file]})&&<button onClick={shareFile}>Partager l’image</button>}<button className="button-link" onClick={close}>Fermer l’aperçu</button></div></section>}{message&&<p role="status">{message}</p>}</div>;
}
