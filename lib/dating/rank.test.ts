import assert from 'node:assert/strict';
import { test } from 'node:test';
import { balanceByGender, rankDiscovery, sortDiscovery, type Rankable } from './rank';

function row(p: Partial<Rankable> & { id: string }): Rankable {
  return {
    genderBucket: 'male',
    isOnline: false,
    hasPhoto: true,
    distanceRank: 0,
    lastActive: 0,
    ...p,
  };
}

test('online profiles outrank offline ones', () => {
  const out = sortDiscovery([
    row({ id: 'offline-near', distanceRank: 0 }),
    row({ id: 'online-far', isOnline: true, distanceRank: 9 }),
  ]);
  assert.equal(out[0].id, 'online-far');
});

test('a photo outranks no photo once both are offline', () => {
  const out = sortDiscovery([
    row({ id: 'blank', hasPhoto: false }),
    row({ id: 'pictured', hasPhoto: true }),
  ]);
  assert.equal(out[0].id, 'pictured');
});

test('photoless and offline is last, never missing', () => {
  const out = sortDiscovery([
    row({ id: 'blank', hasPhoto: false }),
    row({ id: 'online', isOnline: true }),
    row({ id: 'pictured' }),
  ]);
  assert.deepEqual(out.map((r) => r.id), ['online', 'pictured', 'blank']);
  assert.equal(out.length, 3);
});

test('distance then recency break the remaining ties', () => {
  const out = sortDiscovery([
    row({ id: 'far', distanceRank: 3, lastActive: 900 }),
    row({ id: 'near-old', distanceRank: 1, lastActive: 100 }),
    row({ id: 'near-new', distanceRank: 1, lastActive: 500 }),
  ]);
  assert.deepEqual(out.map((r) => r.id), ['near-new', 'near-old', 'far']);
});

test('the order is total, so paging cannot repeat or skip a row', () => {
  const rows = [row({ id: 'b' }), row({ id: 'a' }), row({ id: 'c' })];
  const first = sortDiscovery(rows).map((r) => r.id);
  const second = sortDiscovery([...rows].reverse()).map((r) => r.id);
  assert.deepEqual(first, second);
});

test('genders are interleaved instead of running in blocks', () => {
  const rows = [
    row({ id: 'm1' }), row({ id: 'm2' }), row({ id: 'm3' }),
    row({ id: 'f1', genderBucket: 'female' }),
    row({ id: 'f2', genderBucket: 'female' }),
  ];
  assert.deepEqual(
    balanceByGender(rows).map((r) => r.id),
    ['m1', 'f1', 'm2', 'f2', 'm3'],
  );
});

test('balancing drops nobody when one gender runs out', () => {
  const rows = [
    row({ id: 'm1' }), row({ id: 'm2' }), row({ id: 'm3' }), row({ id: 'm4' }),
    row({ id: 'f1', genderBucket: 'female' }),
  ];
  const out = balanceByGender(rows);
  assert.equal(out.length, 5);
  assert.deepEqual([...out].map((r) => r.id).sort(), ['f1', 'm1', 'm2', 'm3', 'm4']);
});

test('a single-gender list is returned untouched', () => {
  const rows = [row({ id: 'm1' }), row({ id: 'm2' })];
  assert.deepEqual(balanceByGender(rows).map((r) => r.id), ['m1', 'm2']);
});

test('the best-ranked profile still leads after balancing', () => {
  const out = rankDiscovery([
    row({ id: 'm-offline' }),
    row({ id: 'f-online', genderBucket: 'female', isOnline: true }),
  ]);
  assert.equal(out[0].id, 'f-online');
});

test('rankDiscovery keeps every row', () => {
  const rows = Array.from({ length: 50 }, (_, i) =>
    row({
      id: `p${i}`,
      genderBucket: i % 3 === 0 ? 'female' : i % 3 === 1 ? 'male' : 'trans',
      isOnline: i % 5 === 0,
      hasPhoto: i % 4 !== 0,
      distanceRank: i % 7,
      lastActive: i,
    }),
  );
  assert.equal(rankDiscovery(rows).length, 50);
  assert.equal(new Set(rankDiscovery(rows).map((r) => r.id)).size, 50);
});
