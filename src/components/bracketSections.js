export function bracketSection(match) {
 const size=/^T\d+$/.test(match.round)?Number(match.round.slice(1)):null;
 if(size===4||size===2||/^(finale?|semi-finals|demi-finales|bronze|petite finale)$/i.test(match.round))return 'finals';
 const slot=Number(match.sourceKey?.match(/:(\d+)$/)?.[1]);
 if(!size||size<8||!Number.isInteger(Math.log2(size))||!Number.isInteger(slot)||slot<1||slot>size/2)return 'other';
 return String(Math.floor((slot-1)/(size/8))+1);
}
export function sectionGroups(groups,section) {
 return groups.map(group=>({...group,items:group.items.filter(match=>bracketSection(match)===section)}))
 .filter(group=>group.items.length);
}
