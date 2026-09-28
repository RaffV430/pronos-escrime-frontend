import {roundLabel} from './matchPresentation';
import {nextClosingGroup} from './matchPresentation';
export default function ClosingCountdown({matches,now,userId,onSelectMatch}){
 const group=nextClosingGroup(matches,now);
 if(!group)return null;
 const {seconds}=group;
 const missing=group.matches.filter(m=>!m.predictions?.some(p=>p.userId===userId));
 return <aside className="closing-countdown" aria-label="Prochaine clôture des pronostics"><div className="countdown-content"><strong>Prochaine clôture · {group.rounds.map(roundLabel).join(' / ')}</strong><span>{group.matches.length} match{group.matches.length>1?'s':''} concerné{group.matches.length>1?'s':''}</span><small>Enregistrez vos choix avant la fin du délai.</small>{missing.length>0?<details className="countdown-matches"><summary>{missing.length===1?'Voir le match sans pronostic':`Voir les ${missing.length} matchs sans pronostic`}</summary><ul>{missing.map(m=><li key={m.id}><button className="countdown-match-link" onClick={()=>onSelectMatch?.(m.id)}>{m.player1} / {m.player2}{group.rounds.length>1?` · ${roundLabel(m.round)}`:''} <span aria-hidden="true">→</span></button></li>)}</ul></details>:<small className="countdown-complete">Tous vos pronostics sont enregistrés pour cette clôture.</small>}</div><strong className="countdown-digits" aria-label={`${Math.floor(seconds/60)} minutes ${seconds%60} secondes`}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong></aside>;
}
