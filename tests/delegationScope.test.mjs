import { test } from 'node:test';
import assert from 'node:assert/strict';
import { predictionTabs, toggleSection } from '../src/lib/delegationScope.js';
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

test('checkboxes allow multiple sections and keep at least one selection', () => {
  assert.equal(toggleSection('ALL', 'POOLS'), 'TABLEAU,PODIUM');
  assert.equal(toggleSection('TABLEAU,PODIUM', 'TABLEAU'), 'PODIUM');
  assert.equal(toggleSection('PODIUM', 'PODIUM'), 'PODIUM');
  assert.equal(toggleSection('TABLEAU,PODIUM', 'POOLS'), 'ALL');
  assert.deepEqual(
    predictionTabs('POOLS,PODIUM').map(([id]) => id),
    ['pools', 'podium'],
  );
});
