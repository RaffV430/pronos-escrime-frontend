import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveConnections } from '../src/lib/liveConnection.js';
test('une connexion pour plusieurs vues, masquage, reconnexion et arrêt du dernier abonné', () => {
  const sources = [],
    handlers = new Map();
  class Source {
    constructor(url) {
      this.url = url;
      sources.push(this);
    }
    close() {
      this.closed = true;
    }
  }
  const doc = {
    hidden: false,
    addEventListener: (k, f) => handlers.set(k, f),
    removeEventListener: (k) => handlers.delete(k),
  };
  const subscribe = createLiveConnections({
    eventSource: Source,
    get: () => assert.fail('pas de polling en parallèle'),
    baseURL: '/api',
    document: doc,
  });
  let a, b;
  const offA = subscribe(20, (x) => (a = x));
  const offB = subscribe(20, (x) => (b = x));
  assert.equal(sources.length, 1);
  sources[0].onmessage({
    data: JSON.stringify({ version: 1, reset: true, matches: [{ matchId: 1, score1: 3 }], removed: [] }),
  });
  assert.equal(a, b);
  assert.equal(a.get(1).score1, 3);
  offA();
  assert.equal(sources[0].closed, undefined);
  doc.hidden = true;
  handlers.get('visibilitychange')();
  assert.equal(sources[0].closed, true);
  doc.hidden = false;
  handlers.get('visibilitychange')();
  assert.equal(sources.length, 2);
  sources[1].onmessage({ data: JSON.stringify({ version: 1, reset: true, matches: [], removed: [] }) });
  assert.equal(b.size, 0);
  offB();
  assert.equal(sources[1].closed, true);
  assert.equal(handlers.size, 0);
});

test('la vue équipes partage son flux entre vues et reste séparée du flux de pronostic', () => {
  const sources = [];
  class Source { constructor(url) { this.url=url; sources.push(this); } close() { this.closed=true; } }
  const doc={hidden:false,addEventListener(){},removeEventListener(){}};
  const subscribe=createLiveConnections({eventSource:Source,get:()=>assert.fail('aucun polling parallèle'),baseURL:'/api',document:doc});
  let regular,team;
  const a=subscribe(45,x=>regular=x);
  const b=subscribe(45,x=>team=x,{teams:true});
  const c=subscribe(45,()=>{}, {teams:true});
  assert.equal(sources.length,2);
  assert.match(sources[1].url,/teams=1/);
  sources[1].onmessage({data:JSON.stringify([{matchId:'team-live:45:A',score1:21}])});
  assert.equal(team.get('team-live:45:A').score1,21);
  assert.equal(regular.size,0);
  b();assert.equal(sources[1].closed,undefined);c();assert.equal(sources[1].closed,true);
  a();assert.equal(sources[0].closed,true);
});
test('le repli HTTP de la vue équipes garde son périmètre et s’arrête au départ de la page', async()=>{
  const calls=[]; const timers=[];
  const subscribe=createLiveConnections({eventSource:null,get:async url=>{calls.push(url);return {data:[]};},baseURL:'/api',document:{hidden:false,addEventListener(){},removeEventListener(){}},setTimer:fn=>(timers.push(fn),fn),clearTimer(){}});
  const off=subscribe(45,()=>{}, {teams:true});
  await Promise.resolve();await Promise.resolve();
  assert.deepEqual(calls,['/matches/live/45?teams=1']);
  off();await timers[0]?.();assert.equal(calls.length,1);
});
