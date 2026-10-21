import { test } from 'node:test';
import assert from 'node:assert/strict';
const source = new URL('../src/lib/outbox.js', import.meta.url);
let revision = 0;
async function environment() {
  const items = new Map();
  const storage = {
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => items.set(k, String(v)),
    removeItem: (k) => items.delete(k),
  };
  globalThis.localStorage = storage;
  globalThis.window = new EventTarget();
  window.localStorage = storage;
  globalThis.document = new EventTarget();
  document.hidden = false;
  const auth = (id) =>
    'fake.' +
    Buffer.from(JSON.stringify({ userId: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') +
    '.fake';
  storage.setItem('token', auth(9001));
  const realSet = globalThis.setTimeout,
    realClear = globalThis.clearTimeout;
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};
  const box = await import(source.href + '?test=' + ++revision);
  return {
    box,
    storage,
    auth,
    restore: () => {
      globalThis.setTimeout = realSet;
      globalThis.clearTimeout = realClear;
    },
  };
}
const write = (wins) => ({
  key: 'pool:9201',
  method: 'put',
  url: '/pools/9100/fencers/9201/prediction',
  data: { wins, losses: 6 - wins, indicator: null },
});
test('file : panne réseau conservée, dernier choix en attente remplace le précédent, reprise envoie un seul choix', async () => {
  const e = await environment();
  try {
    e.box.startOutbox({
      request: async () => {
        throw Error('offline');
      },
    });
    e.box.queueWrite(write(2));
    e.box.queueWrite(write(4));
    await e.box.flush();
    assert.equal(e.box.pending().length, 1);
    assert.equal(e.box.pending()[0].data.wins, 4);
    let received = [];
    e.box.startOutbox({
      request: async (c) => {
        received.push(c.data.wins);
      },
    });
    await new Promise((r) => queueMicrotask(r));
    await e.box.flush();
    assert.deepEqual(received, [4]);
    assert.equal(e.box.pending().length, 0);
  } finally {
    e.restore();
  }
});
test('file : isolation des comptes sans envoi sous un autre compte', async () => {
  const e = await environment();
  try {
    let received = [];
    e.box.startOutbox({ request: async (c) => received.push(c.data.wins) });
    e.box.queueWrite(write(3));
    e.storage.setItem('token', e.auth(9002));
    await e.box.flush();
    assert.equal(received.length, 0);
    assert.equal(e.box.pending().length, 0);
    e.storage.setItem('token', e.auth(9001));
    assert.equal(e.box.pending().length, 1);
    await e.box.flush();
    assert.deepEqual(received, [3]);
  } finally {
    e.restore();
  }
});
test('file : refus définitif 409 signalé et retiré sans toucher à l’ancien pronostic serveur', async () => {
  const e = await environment();
  try {
    let events = [];
    window.addEventListener(e.box.OUTBOX_EVENT, (x) => events.push(x.detail));
    e.box.startOutbox({
      request: async () => {
        throw { response: { status: 409, data: { error: 'Clos' } } };
      },
    });
    e.box.queueWrite(write(5));
    await e.box.flush();
    assert.equal(e.box.pending().length, 0);
    assert.equal(events.at(-1).status, 409);
    assert.equal(events.at(-1).ok, false);
  } finally {
    e.restore();
  }
});
test('EXIGENCE : un 503 temporaire doit rester en attente pour un nouvel essai', async () => {
  const e = await environment();
  try {
    e.box.startOutbox({
      request: async () => {
        throw { response: { status: 503, data: { error: 'Temporaire' } } };
      },
    });
    e.box.queueWrite(write(3));
    await e.box.flush();
    assert.equal(e.box.pending().length, 1, 'Ne pas jeter un choix lors d’une panne temporaire du serveur');
  } finally {
    e.restore();
  }
});
test('ancien renvoi lent : le choix récent attend puis est envoyé dans le même cycle', async () => {
  const e = await environment();
  try {
    let release;
    const gate = new Promise((r) => (release = r));
    let server = 4;
    let received = [];
    const client = {
      request: async (c) => {
        if (c.data.wins === 2) await gate;
        server = c.data.wins;
        received.push(server);
      },
    };
    e.box.startOutbox(client);
    e.box.queueWrite(write(2));
    const inFlight = e.box.flush();
    await new Promise((r) => queueMicrotask(r));
    e.box.queueWrite(write(5));
    release();
    await inFlight;
    assert.equal(server, 5);
    assert.deepEqual(received, [2, 5]);
    assert.equal(e.box.pending().length, 0);
  } finally {
    e.restore();
  }
});
test('vue détaillée : écriture directe partage le verrou de l’envoi différé', async () => {
  const e = await environment();
  try {
    let release;
    const gate = new Promise((r) => (release = r));
    let server = 4;
    let order = [];
    const client = {
      request: async (c) => {
        if (c.data.wins === 2) await gate;
        server = c.data.wins;
        order.push(server);
      },
    };
    e.box.startOutbox(client);
    e.box.queueWrite(write(2));
    const first = e.box.flush();
    await new Promise((r) => queueMicrotask(r));
    const direct = e.box.serializeWrite('pool:9201', () => client.request({ data: { wins: 5 } }));
    release();
    await Promise.all([first, direct]);
    assert.equal(server, 5);
    assert.deepEqual(order, [2, 5]);
  } finally {
    e.restore();
  }
});
test('révisions distinctes : résultat remplacé non annoncé comme dernier choix', async () => {
  const e = await environment();
  try {
    let events = [];
    let release;
    const gate = new Promise((r) => (release = r));
    window.addEventListener(e.box.OUTBOX_EVENT, (x) => events.push(x.detail));
    e.box.startOutbox({
      request: async (c) => {
        if (c.data.wins === 1) await gate;
      },
    });
    e.box.queueWrite(write(1));
    const old = e.box.pending()[0];
    const first = e.box.flush();
    await new Promise((r) => queueMicrotask(r));
    e.box.queueWrite(write(4));
    assert.notEqual(e.box.pending()[0].revision, old.revision);
    release();
    await first;
    assert.deepEqual(
      events.filter((x) => x.ok).map((x) => x.data.wins),
      [4],
    );
  } finally {
    e.restore();
  }
});
test('stockage bloqué : aucun succès silencieux ni intention non conservée envoyée', async () => {
  const e = await environment();
  try {
    let writes = 0;
    e.box.startOutbox({ request: async () => writes++ });
    e.storage.setItem = () => {
      throw Error('quota');
    };
    assert.equal(e.box.queueWrite(write(4)), false);
    await e.box.flush();
    assert.equal(writes, 0);
  } finally {
    e.restore();
  }
});
test('accusé conservé pendant un rechargement puis consommé une fois par le bon compte', async () => {
  const e = await environment();
  try {
    e.box.startOutbox({ request: async () => {} });
    e.box.queueWrite(write(4));
    await e.box.flush();
    e.storage.setItem('token', e.auth(9002));
    assert.deepEqual(e.box.takeDeliveries(['pool:9201']), []);
    e.storage.setItem('token', e.auth(9001));
    const receipts = e.box.takeDeliveries(['pool:9201']);
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].data.wins, 4);
    assert.deepEqual(e.box.takeDeliveries(['pool:9201']), []);
  } finally {
    e.restore();
  }
});
test('401, 408, 429 conservés ; refus 400 retire uniquement la saisie refusée', async () => {
  for (const status of [401, 408, 429, 400]) {
    const e = await environment();
    try {
      e.box.startOutbox({
        request: async () => {
          throw { response: { status, data: { error: 'test' } } };
        },
      });
      e.box.queueWrite(write(3));
      await e.box.flush();
      assert.equal(e.box.pending().length, status === 400 ? 0 : 1, String(status));
    } finally {
      e.restore();
    }
  }
});

test('un choix plus récent créé pendant une écriture directe ne doit pas être effacé par son accusé', async () => {
  const e = await environment();
  try {
    e.box.queueWrite(write(2));
    const old = e.box.pending()[0];
    e.box.queueWrite(write(5));
    e.box.dropWrite('pool:9201', old.revision);
    assert.equal(e.box.pending()[0].data.wins, 5);
  } finally {
    e.restore();
  }
});

test('un changement de compte pendant un renvoi arrête le lot et conserve les autres choix du premier compte', async () => {
  const e = await environment();
  try {
    let calls = 0;
    e.box.startOutbox({
      request: async () => {
        calls++;
        e.storage.setItem('token', e.auth(9002));
      },
    });
    e.box.queueWrite(write(2));
    e.box.queueWrite({ ...write(4), key: 'pool:9202', url: '/pools/9100/fencers/9202/prediction' });
    await e.box.flush();
    assert.equal(calls, 1);
    assert.equal(e.box.pending().length, 0);
    e.storage.setItem('token', e.auth(9001));
    assert.equal(e.box.pending().length, 1);
    assert.equal(e.box.pending()[0].key, 'pool:9202');
  } finally {
    e.restore();
  }
});

test('suppression confirmée dans la vue détaillée : un ancien PUT encore en attente ne ressuscite pas le pronostic', async () => {
  const e = await environment();
  try {
    let writes = 0;
    e.box.startOutbox({ request: async () => writes++ });
    e.box.queueWrite(write(2));
    const previous = e.box.pending()[0];
    await e.box.serializeWrite('pool:9201', async () => {});
    e.box.dropWrite('pool:9201', previous.revision);
    await e.box.flush();
    assert.equal(writes, 0);
    assert.equal(e.box.pending().length, 0);
  } finally {
    e.restore();
  }
});

test('accusés de deux épreuves absentes : une seule consommation par épreuve et par compte', async () => {
  const e = await environment();
  try {
    e.box.startOutbox({ request: async () => {} });
    for (const id of [42, 43])
      e.box.queueWrite({ key: `match:${id}`, method: 'post', url: `/matches/${id}/predict`, data: { winner: 2 } });
    await e.box.flush();
    assert.deepEqual(e.box.pending(), []);
    assert.equal(e.box.takeDeliveries(['match:99']).length, 0);
    assert.equal(e.box.takeDeliveries(['match:42']).length, 1);
    assert.equal(e.box.takeDeliveries(['match:42']).length, 0);
    e.storage.setItem('token', e.auth(9002));
    assert.equal(e.box.takeDeliveries(['match:43']).length, 0);
    e.storage.setItem('token', e.auth(9001));
    assert.equal(e.box.takeDeliveries(['match:43']).length, 1);
  } finally {
    e.restore();
  }
});

test('audit : matrice des erreurs transitoires et des refus définitifs', async () => {
  for (const status of [400, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504]) {
    const e = await environment();
    try {
      e.box.startOutbox({
        request: async () => {
          throw { response: { status, data: { error: 'fictif' } } };
        },
      });
      e.box.queueWrite({ key: 'match:42', method: 'post', url: '/matches/42/predict', data: { winner: 1 } });
      await e.box.flush();
      const retry = [408, 429, 500, 502, 503, 504].includes(status);
      assert.equal(e.box.pending().length, retry ? 1 : 0, String(status));
      assert.equal(e.box.takeDeliveries(['match:42']).length, retry ? 0 : 1, String(status));
    } finally {
      e.restore();
    }
  }
});
test('audit : jeton expiré et durée de vie de 24 heures ne sont pas une reprise illimitée', async () => {
  const e = await environment(),
    now = Date.now;
  try {
    e.box.startOutbox({ request: async () => {} });
    e.storage.setItem(
      'token',
      'fake.' +
        Buffer.from(JSON.stringify({ userId: 9001, exp: Math.floor(now() / 1000) - 1 })).toString('base64url') +
        '.fake',
    );
    assert.equal(e.box.queueWrite(write(3)), false);
    e.storage.setItem('token', e.auth(9001));
    e.box.queueWrite(write(3));
    Date.now = () => now() + 25 * 3600000;
    assert.equal(e.box.pending().length, 0);
  } finally {
    Date.now = now;
    e.restore();
  }
});

const matchWrite = (accountId = 9001, winner = 1) => ({
  key: 'match:42',
  method: 'post',
  url: '/matches/42/predict',
  data: { winner },
  accountId,
});

test('premier envoi : stockage bloqué interdit toute requête réseau', async () => {
  const e = await environment();
  let calls = 0;
  try {
    e.box.startOutbox({
      request: async () => {
        calls++;
      },
    });
    e.storage.setItem = () => {
      throw Error('quota');
    };
    assert.equal((await e.box.sendPersistedWrite(matchWrite())).kind, 'blocked');
    assert.equal(calls, 0);
    assert.deepEqual(e.box.pending(), []);
  } finally {
    e.restore();
  }
});
test('premier503 puis reconnexion : choix durable avant le POST et reprise unique', async () => {
  const e = await environment();
  let failed = true,
    calls = 0;
  try {
    e.box.startOutbox({
      request: async () => {
        calls++;
        assert.equal(e.box.pending().length, 1);
        if (failed) throw { response: { status: 503 } };
        return { data: { id: 42 } };
      },
    });
    assert.equal((await e.box.sendPersistedWrite(matchWrite())).kind, 'deferred');
    assert.equal(e.box.pending()[0].data.winner, 1);
    failed = false;
    await e.box.flush();
    assert.equal(calls, 2);
    assert.equal(e.box.pending().length, 0);
    assert.equal(e.box.takeDeliveries(['match:42'])[0].ok, true);
  } finally {
    e.restore();
  }
});
test('premier401 retirant le jeton : conservation sous le compte original, jamais sous un autre', async () => {
  const e = await environment();
  let calls = 0;
  try {
    e.box.startOutbox({
      request: async () => {
        calls++;
        if (calls === 1) {
          e.storage.removeItem('token');
          throw { response: { status: 401 } };
        }
        return { data: { id: 42 } };
      },
    });
    assert.equal((await e.box.sendPersistedWrite(matchWrite())).kind, 'deferred');
    e.storage.setItem('token', e.auth(9002));
    await e.box.flush();
    assert.equal(calls, 1);
    e.storage.setItem('token', e.auth(9001));
    assert.equal(e.box.pending().length, 1);
    await e.box.flush();
    assert.equal(calls, 2);
    assert.equal(e.box.pending().length, 0);
  } finally {
    e.restore();
  }
});
test('JWT déjà expiré : attente conservée pour le compte vérifié, transport différé jusqu’à reconnexion', async () => {
  const e = await environment();
  let calls = 0;
  try {
    e.box.startOutbox({
      request: async () => {
        calls++;
        return { data: { id: 42 } };
      },
    });
    e.storage.setItem(
      'token',
      'fake.' +
        Buffer.from(JSON.stringify({ userId: 9001, exp: Math.floor(Date.now() / 1000) - 1 })).toString('base64url') +
        '.fake',
    );
    assert.deepEqual(await e.box.sendPersistedWrite(matchWrite()), { kind: 'deferred', status: 401 });
    assert.equal(calls, 0);
    e.storage.setItem('token', e.auth(9002));
    await e.box.flush();
    assert.equal(calls, 0);
    assert.equal((await e.box.sendPersistedWrite(matchWrite())).kind, 'blocked');
    e.storage.setItem('token', e.auth(9001));
    assert.equal(e.box.pending().length, 1);
    await e.box.flush();
    assert.equal(calls, 1);
  } finally {
    e.restore();
  }
});
test('premier envoi et réveil de file simultanés : un seul POST et reçu durable pour écran démonté', async () => {
  const e = await environment();
  let release, entered;
  const started = new Promise((r) => (entered = r)),
    gate = new Promise((r) => (release = r));
  let calls = 0;
  try {
    e.box.startOutbox({
      request: async () => {
        calls++;
        entered();
        await gate;
        return { data: { id: 42 } };
      },
    });
    const first = e.box.sendPersistedWrite(matchWrite());
    await started;
    const retry = e.box.flush();
    release();
    assert.equal((await first).kind, 'saved');
    await retry;
    assert.equal(calls, 1);
    const receipt = e.box.takeDeliveries(['match:42']);
    assert.equal(receipt.length, 1);
    assert.equal(receipt[0].ok, true);
  } finally {
    e.restore();
  }
});
test('nouveau choix pendant le premier POST : ancien accusé ne retire pas la nouvelle attente', async () => {
  const e = await environment();
  let release, entered;
  const started = new Promise((r) => (entered = r)),
    gate = new Promise((r) => (release = r));
  const sent = [];
  try {
    e.box.startOutbox({
      request: async (c) => {
        sent.push(c.data.winner);
        if (sent.length === 1) {
          entered();
          await gate;
        }
        return { data: { id: 42 } };
      },
    });
    const first = e.box.sendPersistedWrite(matchWrite());
    await started;
    e.box.queueWrite(matchWrite(9001, 2));
    release();
    assert.equal((await first).kind, 'superseded');
    assert.equal(e.box.pending()[0].data.winner, 2);
    await e.box.flush();
    assert.deepEqual(sent, [1, 2]);
    assert.equal(e.box.pending().length, 0);
  } finally {
    e.restore();
  }
});
test('refus définitif au premier envoi : pas de renvoi, reçu de refus préservé', async () => {
  for (const status of [400, 403, 409, 422]) {
    const e = await environment();
    let calls = 0;
    try {
      e.box.startOutbox({
        request: async () => {
          calls++;
          throw { response: { status, data: { error: 'refus fictif' } } };
        },
      });
      assert.equal((await e.box.sendPersistedWrite(matchWrite())).kind, 'refused');
      assert.equal(e.box.pending().length, 0);
      await e.box.flush();
      assert.equal(calls, 1);
      assert.equal(e.box.takeDeliveries(['match:42'])[0].status, status);
    } finally {
      e.restore();
    }
  }
});
