import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('identity review and podium keep distinct keys for the same competition', () => {
  const source = readFileSync(new URL('../src/components/AdminPanel.jsx', import.meta.url), 'utf8');
  const identity = source.match(/<IdentityReview\s+key=\{`([^`]+)`\}/)?.[1];
  const podium = source.match(/<PodiumPrediction\s+key=\{`([^`]+)`\}/)?.[1];
  assert.ok(identity, 'IdentityReview needs its own stable key');
  assert.ok(podium, 'PodiumPrediction needs its own stable key');
  for (const id of [14, 15]) {
    const key = (template) => template.replace('${competitionId}', String(id));
    assert.notEqual(key(identity), key(podium), 'sibling keys must not collide on refresh');
  }
});
