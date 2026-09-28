import {isMatchClosed} from './matchPresentation';
export default function MatchTiming({match,now,hideChecked=false}){
 const date=v=>v?new Date(v).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'Non communiqué';
 return <div className="timing"><p>{isMatchClosed(match,now)?'Pronostics clos':match.manualUnlockUntil?`Réouvert jusqu’à ${date(match.manualUnlockUntil)}`:match.awaitingPreviousRound?'Ouvert · en attente de la fin du tour précédent':match.closesAt?`Ferme le ${date(match.closesAt)}`:'Ouvert · horaire de clôture à confirmer'}</p>
 <details><summary>Horaires et vérification</summary><p>Début prévu : {date(match.startsAt)}. Heures de votre appareil.</p>{match.awaitingPreviousRound&&<p>Au moins 10 minutes après l’enregistrement du dernier résultat du tour précédent.</p>}{!hideChecked&&<small>Dernière vérification officielle : {date(match.sourceCheckedAt)}</small>}</details></div>;
}
