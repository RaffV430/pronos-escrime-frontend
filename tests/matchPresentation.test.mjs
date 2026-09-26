import test from 'node:test';
import assert from 'node:assert/strict';
import {isMatchClosed,validateScores,groupMatches} from '../src/components/matchPresentation.js';
test('a final cannot reopen, manual override bypasses only timed or manual lock',()=>{const now=10000;assert.equal(isMatchClosed({isFinished:true,manualUnlockUntil:new Date(20000).toISOString()},now),true);assert.equal(isMatchClosed({isLocked:true,manualUnlockUntil:new Date(20000).toISOString()},now),false);assert.equal(isMatchClosed({closesAt:new Date(now).toISOString()},now),true);assert.equal(isMatchClosed({closesAt:new Date(now+1).toISOString()},now),false)});
test('integer bounds and unequal scores in individual and team events',()=>{for(const [a,b,max] of [['',2,15],['1.5',2,15],[-1,3,15],[16,3,15],[45,46,45],['05',5,15]])assert.ok(validateScores({score1:a,score2:b},max));assert.equal(validateScores({score1:'14',score2:'13'},15),null);assert.equal(validateScores({score1:45,score2:44},45),null)});
test('official slot gaps and distinct bronze round are preserved',()=>{const out=groupMatches([{id:1,round:'T16',sourceKey:'Table of 16:4'},{id:2,round:'T32',sourceKey:'Table of 32:8'},{id:3,round:'T32',sourceKey:'Table of 32:2'},{id:4,round:'Bronze',sourceKey:'Bronze:1'}]);assert.deepEqual(out.map(g=>g.round),['T32','T16','Bronze']);assert.deepEqual(out[0].items.map(m=>m.sourceKey),['Table of 32:2','Table of 32:8'])});

import {bracketLayout} from '../src/components/matchPresentation.js';
test('later rounds center on feeder slots, including gaps and skipped rounds',()=>{
 const match=(round,n)=>({id:round+n,round,sourceKey:`Table of ${round.slice(1)}:${n}`});
 const out=bracketLayout(groupMatches([match('T32',1),match('T32',2),match('T32',8),match('T16',1),match('T8',1)]));
 const center=s=>s.start-1+s.span/2;
 assert.equal(center(out[1].slots[0]),(center(out[0].slots[0])+center(out[0].slots[1]))/2);
 assert.equal(out[0].slots[2].start,15);
 assert.equal(center(out[2].slots[0]),4);
 assert.equal(bracketLayout(groupMatches([{id:1,round:'Bronze',sourceKey:'Bronze:1'}]))[0].aligned,false);
 assert.equal(bracketLayout(groupMatches([{id:1,round:'T16'}]))[0].aligned,false);
});

import {entryRank} from '../src/components/matchPresentation.js';
test('entry ranks require a unique complete name and a positive recorded rank',()=>{
 assert.equal(entryRank([{name:' FRANCE ',entryRanking:7}],'france'),7);
 assert.equal(entryRank([{name:'FRANCE',entryRanking:0}],'FRANCE'),null);
 assert.equal(entryRank([{name:'FRANCE',ranking:7}],'FRANCE'),null);
 assert.equal(entryRank([{name:'FRANCE',entryRanking:7},{name:'France',entryRanking:9}],'FRANCE'),null);
});

import {bracketSection,sectionGroups} from '../src/components/bracketSections.js';
test('quarters follow official match numbers through T8 without compaction',()=>{
 const m=(round,n)=>({round,sourceKey:`Table:${n}`});
 for(let q=1;q<=4;q++){
  assert.equal(bracketSection(m('T32',q*4)),String(q));
  assert.equal(bracketSection(m('T16',q*2)),String(q));
  assert.equal(bracketSection(m('T8',q)),String(q));
 }
 assert.equal(bracketSection(m('T4',1)),'finals');
 assert.equal(bracketSection(m('Bronze',1)),'finals');
 assert.equal(bracketSection({round:'T32'}),'other');
 assert.equal(sectionGroups([{round:'T32',items:[m('T32',2),m('T32',10)]}],'3')[0].items[0].sourceKey,'Table:10');
});

test('round override expires and pending previous results do not close early',()=>{
 assert.equal(isMatchClosed({manualUnlockUntil:new Date(10000).toISOString(),awaitingPreviousRound:true},10000),true);
 assert.equal(isMatchClosed({awaitingPreviousRound:true,closesAt:new Date(1).toISOString()},10000),false);
 assert.equal(isMatchClosed({timingUnverified:true},10000),true);
});
