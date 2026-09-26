import {remainingSeconds} from './matchPresentation';
export default function ClosingCountdown({matches,now}){
 const upcoming=matches.map(match=>({match,seconds:remainingSeconds(match,now)})).filter(x=>x.seconds>0&&x.seconds<=900).sort((a,b)=>a.seconds-b.seconds);
 if(!upcoming.length)return null;
 const {match,seconds}=upcoming[0];
 return <aside className="closing-countdown" aria-label="Prochaine clôture des pronostics"><div><strong>Prochaine clôture · {match.round}</strong><span>{match.player1} / {match.player2}</span><small>Enregistrez vos choix avant la fin du délai.</small></div><strong className="countdown-digits" aria-label={`${Math.floor(seconds/60)} minutes ${seconds%60} secondes`}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong></aside>;
}
