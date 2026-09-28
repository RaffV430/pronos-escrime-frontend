import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
test('receiver formats UTC deadline in its current timezone without reopening the app', () => {
  const previous = process.env.TZ;
  try {
    const context = vm.createContext({ self: { addEventListener() {} }, Intl, Date });
    vm.runInContext(source, context);
    const payload = {
      timing: {
        version: 1,
        round: 'Finale',
        count: 1,
        kind: 'AVAILABLE',
        closesAt: '2026-09-28T12:50:00Z',
        staggered: false,
      },
    };
    process.env.TZ = 'Europe/Paris';
    assert.match(context.notificationBody(payload, new Date('2026-09-28T12:00:00Z')), /clôture à 14:50$/);
    process.env.TZ = 'Europe/Istanbul';
    assert.match(context.notificationBody(payload, new Date('2026-09-28T12:00:00Z')), /clôture à 15:50$/);
    process.env.TZ = 'America/New_York';
    assert.match(context.notificationBody(payload, new Date('2026-09-28T12:00:00Z')), /clôture à 08:50$/);
    payload.timing.closesAt = null;
    assert.match(context.notificationBody(payload), /à confirmer$/);
    assert.equal(context.notificationBody({ body: 'Legacy' }), 'Legacy');
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
