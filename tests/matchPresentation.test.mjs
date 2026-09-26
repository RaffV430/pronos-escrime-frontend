import test from 'node:test';
import assert from 'node:assert/strict';
import {isMatchClosed,validateScores,groupMatches} from '../src/components/matchPresentation.js';
test('a final cannot reopen, manual override bypasses only timed or manual lock',()=>{const now=10000;assert.equal(isMatchClosed({isFinished:true,manualUnlock:true},now),true);assert.equal(isMatchClosed({isLocked:true,manualUnlock:true},now),false);assert.equal(isMatchClosed({closesAt:new Date(now).toISOString()},now),true);assert.equal(isMatchClosed({closesAt:new Date(now+1).toISOString()},now),false)});
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
