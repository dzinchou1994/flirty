import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  discoveryAttributeWhere,
  distanceBucketAllowed,
  parseDiscoveryFilters,
} from './discovery-filters';

describe('parseDiscoveryFilters', () => {
  it('parses CSV multi-selects and ranges', () => {
    const f = parseDiscoveryFilters(
      new URLSearchParams(
        'bucket=male&city=tbilisi&ageMin=25&ageMax=40&bodyType=slim,athletic&lookingForTags=chat,dates&distance=3km&onlineOnly=1',
      ),
    );
    assert.equal(f.bucket, 'male');
    assert.equal(f.city, 'tbilisi');
    assert.equal(f.ageMin, 25);
    assert.equal(f.ageMax, 40);
    assert.deepEqual(f.bodyType, ['slim', 'athletic']);
    assert.deepEqual(f.lookingForTags, ['chat', 'dates']);
    assert.equal(f.distance, '3km');
    assert.equal(f.onlineOnly, true);
  });

  it('drops unknown option keys', () => {
    const f = parseDiscoveryFilters({ bodyType: 'slim,alien,athletic' });
    assert.deepEqual(f.bodyType, ['slim', 'athletic']);
  });
});

describe('discoveryAttributeWhere — null means unknown', () => {
  it('scalar filter ORs null so unanswered profiles stay', () => {
    const parts = discoveryAttributeWhere({
      ...parseDiscoveryFilters({}),
      bodyType: ['slim'],
    });
    const body = parts.find((p) => Array.isArray((p as { OR?: unknown }).OR));
    assert.ok(body);
    const or = (body as { OR: unknown[] }).OR;
    assert.ok(or.some((c) => (c as { bodyType?: null }).bodyType === null));
    assert.ok(
      or.some(
        (c) =>
          Array.isArray((c as { bodyType?: { in?: string[] } }).bodyType?.in) &&
          (c as { bodyType: { in: string[] } }).bodyType.in.includes('slim'),
      ),
    );
  });

  it('array filter uses hasSome and keeps empty arrays', () => {
    const parts = discoveryAttributeWhere({
      ...parseDiscoveryFilters({}),
      lookingForTags: ['chat'],
    });
    const clause = parts.find((p) => Array.isArray((p as { OR?: unknown }).OR));
    assert.ok(clause);
    const or = (clause as { OR: Record<string, unknown>[] }).OR;
    assert.ok(
      or.some(
        (c) =>
          (c.lookingForTags as { hasSome?: string[] } | undefined)?.hasSome?.[0] ===
          'chat',
      ),
    );
    assert.ok(
      or.some(
        (c) =>
          (c.lookingForTags as { isEmpty?: boolean } | undefined)?.isEmpty === true,
      ),
    );
  });

  it('does not add a clause when the filter is empty', () => {
    const parts = discoveryAttributeWhere(parseDiscoveryFilters({}));
    assert.equal(parts.length, 0);
  });
});

describe('distanceBucketAllowed', () => {
  it('1km keeps only the closest bucket', () => {
    assert.equal(distanceBucketAllowed('<1km', '1km'), true);
    assert.equal(distanceBucketAllowed('1-3km', '1km'), false);
  });

  it('any keeps every bucket', () => {
    assert.equal(distanceBucketAllowed('10km+', 'any'), true);
  });
});
