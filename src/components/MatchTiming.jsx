export default function MatchTiming({ match, now, hideChecked = false }) {
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 const date=v=>v?new Date(v).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'Non communiqué';
 const seconds=match.closesAt?Math.max(0,Math.ceil((Date.parse(match.closesAt)-now)/1000)):null;
 return <div className="timing"><p>Début prévu : {date(match.startsAt)} · Clôture : {date(match.closesAt)} <small>({zone})</small></p>
 {match.manualUnlockUntil&&now<Date.parse(match.manualUnlockUntil)?<p>🔓 Réouvert par l’administration jusqu’au {date(match.manualUnlockUntil)}</p>:seconds>0&&!match.isLocked&&!match.isFinished?<p>Temps restant : {Math.floor(seconds/3600)} h {Math.floor(seconds%3600/60)} min {seconds%60} s</p>:null}
 {match.timingUnverified&&!match.isFinished&&<p>Vérification des paramètres du tour en attente.</p>}
 {match.awaitingPreviousRound&&!match.manualUnlockUntil&&!match.isFinished&&!match.isLocked&&<p>Ouvert · clôture au plus tôt 10 minutes après le dernier résultat du tour précédent. Horaire à confirmer lors de l’import.</p>}
 {!hideChecked&&<small>{match.isFinished?'Résultat définitif':'Données provisoires'} · Dernière vérification officielle : {date(match.sourceCheckedAt)}</small>}</div>;
}
