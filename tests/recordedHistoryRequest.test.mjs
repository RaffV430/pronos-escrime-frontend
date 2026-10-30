import test from 'node:test';
import assert from 'node:assert/strict';
import { requestRecordedHistory } from '../src/lib/recordedHistoryRequest.js';
const tick = () => new Promise((resolve) => setImmediate(resolve));
test('a consultation makes one public read for its match and preserves all server notices', async () => {
  const calls = [],
    rows = [];
  const data = { history: [{ by: 1, score1: 1, score2: 0 }], historyNotice: 'Filtered', podiumFormat: 'TEAM' };
  requestRecordedHistory(
    async (url) => {
      calls.push(url);
      return { data };
    },
    7,
    (x) => rows.push(x),
  );
  await tick();
  assert.deepEqual(calls, ['/public/matches/7/live-history']);
  assert.deepEqual(rows, [{ matchId: 7, ...data }]);
});
test('a late response from a closed match cannot replace the selected match history', async () => {
  let finish;
  const rows = [];
  const stop = requestRecordedHistory(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    1,
    (x) => rows.push(x),
  );
  await tick();
  stop();
  requestRecordedHistory(
    async () => ({ data: { history: [] } }),
    2,
    (x) => rows.push(x),
  );
  finish({ data: { history: [{ by: 1 }] } });
  await tick();
  assert.deepEqual(rows, [{ matchId: 2, history: [] }]);
});
test('an error can be retried without writing or fabricating an empty success', async () => {
  const rows = [];
  requestRecordedHistory(
    async () => {
      throw Error('offline');
    },
    4,
    (x) => rows.push(x),
  );
  await tick();
  assert.ok(rows[0].error);
  assert.equal(rows[0].history, undefined);
  requestRecordedHistory(
    async () => ({ data: { history: [] } }),
    4,
    (x) => rows.push(x),
  );
  await tick();
  assert.deepEqual(rows[1], { matchId: 4, history: [] });
});
test('late failures from a closed dialog are ignored', async () => {
  let reject;
  const rows = [];
  const stop = requestRecordedHistory(
    () =>
      new Promise((_, r) => {
        reject = r;
      }),
    3,
    (x) => rows.push(x),
  );
  await tick();
  stop();
  reject(Error('offline'));
  await tick();
  assert.deepEqual(rows, []);
});
