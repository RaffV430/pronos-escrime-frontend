import { test } from 'node:test';
import assert from 'node:assert/strict';
import { predictionTabs } from '../src/lib/delegationScope.js';
test('delegation personal choice exposes the matching prediction sections', () => {
  assert.deepEqual(predictionTabs('TABLEAU'), [['tableau', 'Tableau']]);
  assert.deepEqual(predictionTabs('PODIUM'), [['podium', 'Podium']]);
  assert.deepEqual(
    predictionTabs().map(([id]) => id),
    ['pools', 'tableau', 'podium'],
  );
  assert.deepEqual(
    predictionTabs('ALL', true).map(([id]) => id),
    ['tableau', 'podium'],
  );
});
