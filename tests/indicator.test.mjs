import test from 'node:test';
import assert from 'node:assert/strict';
import { indicatorError, parseIndicator, toggleSign } from '../src/lib/indicator.js';
import { isUpcoming } from '../src/components/matchPresentation.js';

test('the ± button flips the sign without the Android minus key', () => {
  assert.equal(toggleSign('5'), '-5');
  assert.equal(toggleSign('-5'), '5');
  assert.equal(toggleSign('+8'), '-8');
  assert.equal(toggleSign(''), '-');
  assert.equal(toggleSign('-'), '');
  assert.equal(toggleSign(3), '-3');
});

test('indicator parsing accepts signed integers, including a pasted typographic minus', () => {
  assert.equal(parseIndicator('-12'), -12);
  assert.equal(parseIndicator('+4'), 4);
  assert.equal(parseIndicator('0'), 0);
  assert.equal(parseIndicator('−3'), -3);
  assert.equal(parseIndicator('-'), null);
  assert.equal(parseIndicator(''), null);
  assert.equal(parseIndicator('1.5'), null);
});

test('indicator validation explains empty, malformed and out-of-range values', () => {
  assert.equal(indicatorError('-7', -25, 25), '');
  assert.match(indicatorError('', -25, 25), /requis/);
  assert.match(indicatorError('-', -25, 25), /±/);
  assert.equal(indicatorError('-30', -25, 25), 'Indice entre -25 et 25.');
});

test('"À venir" lists every match without a published result, open or closed', () => {
  assert.equal(isUpcoming({ isFinished: false }), true);
  assert.equal(isUpcoming({ isFinished: false, isLocked: true }), true);
  assert.equal(isUpcoming({ isFinished: true }), false);
  assert.equal(isUpcoming({ isFinished: true, resultType: 'CANCELLED' }), false);
});
