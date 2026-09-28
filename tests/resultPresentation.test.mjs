import test from 'node:test';
import assert from 'node:assert/strict';
import {plural,roundStatus,filterPredictionRows,sharePayload,APP_URL} from '../src/components/resultPresentation.js';
test('French singular, plural and round agreements',()=>{assert.equal(plural(1,'point'),'point');assert.equal(plural(0,'point'),'point');assert.equal(plural(2,'score exact','scores exacts'),'scores exacts');assert.equal(roundStatus('T4',true),'Terminées');assert.equal(roundStatus('T2',true),'Terminée');assert.equal(roundStatus('T16',true),'Terminé');});
test('round recap only selects its matches across statuses',()=>{const rows=[{round:'T16',status:'Terminé'},{round:'T8',status:'Clos'},{type:'Podium'}];assert.deepEqual(filterPredictionRows(rows,'Tous','T16'),[rows[0]]);assert.deepEqual(filterPredictionRows(rows,'Clos','T16'),[]);assert.equal(filterPredictionRows(rows,'Tous',null).length,3);});
test('native sharing includes the app link and singular points',()=>{const file={};const payload=sharePayload({tournamentName:'Test',ranking:{totalPoints:1}},file);assert.equal(payload.url,APP_URL);assert.deepEqual(payload.files,[file]);assert.match(payload.text,/1 point\./);});
