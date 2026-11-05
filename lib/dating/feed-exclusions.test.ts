import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  discoveryAttributeWhere,
  discoveryPassExclusions,
  parseDiscoveryFilters,
} from './discovery-filters';

describe('filtered feed still excludes pass / self', () => {
  it('composes pass exclusions with attribute filters', () => {
    const viewerId = 'user_abc';
    const attrs = discoveryAttributeWhere({
      ...parseDiscoveryFilters({}),
      bodyType: ['slim'],
      lookingForTags: ['chat'],
    });
    const and = [...discoveryPassExclusions(viewerId), ...attrs];

    assert.ok(
      and.some(
        (c) =>
          (c as { passesReceived?: { none?: { fromUserId?: string } } }).passesReceived
            ?.none?.fromUserId === viewerId,
      ),
    );
    assert.ok(
      and.some(
        (c) => (c as { userId?: { not?: string } }).userId?.not === viewerId,
      ),
    );
    assert.ok(attrs.length >= 2, 'attribute clauses present');
    // Attribute filters must not replace exclusion clauses.
    assert.ok(and.length > attrs.length);
  });

  it('null bodyType profiles stay when bodyType is filtered', () => {
    const parts = discoveryAttributeWhere({
      ...parseDiscoveryFilters({}),
      bodyType: ['athletic'],
    });
    const or = (parts[0] as { OR: unknown[] }).OR;
    assert.ok(or.some((c) => (c as { bodyType: null }).bodyType === null));
  });
});
