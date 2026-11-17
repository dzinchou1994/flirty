import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRecentlyOnline, onlineSince } from './presence';

describe('isRecentlyOnline', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');

  it('is online inside the 15 minute window', () => {
    assert.equal(isRecentlyOnline(new Date(now - 14 * 60 * 1000), now), true);
  });

  it('is offline once the window has passed', () => {
    assert.equal(isRecentlyOnline(new Date(now - 16 * 60 * 1000), now), false);
    assert.equal(isRecentlyOnline(null, now), false);
  });

  it('onlineSince is the same cutoff the label uses', () => {
    const cutoff = onlineSince(now).getTime();
    assert.equal(isRecentlyOnline(new Date(cutoff + 1), now), true);
    assert.equal(isRecentlyOnline(new Date(cutoff), now), false);
  });
});
