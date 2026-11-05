import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  wouldExcludeByBlock,
  wouldExcludeByContact,
  isVisibleUnderMode,
} from './privacy-logic';

describe('blocking (symmetric)', () => {
  const blocks = [{ blockerId: 'a', blockedUserId: 'b' }];

  it('hides blocked user from blocker', () => {
    assert.equal(
      wouldExcludeByBlock({ blocks, viewerId: 'a', ownerId: 'b' }),
      true,
    );
  });

  it('hides blocker from blocked user', () => {
    assert.equal(
      wouldExcludeByBlock({ blocks, viewerId: 'b', ownerId: 'a' }),
      true,
    );
  });

  it('does not hide unrelated users', () => {
    assert.equal(
      wouldExcludeByBlock({ blocks, viewerId: 'a', ownerId: 'c' }),
      false,
    );
  });
});

describe('mutual contact exclusion', () => {
  it('excludes when viewer is in owner book', () => {
    assert.equal(
      wouldExcludeByContact({
        viewerPhoneHash: 'hash-v',
        viewerContactHashes: [],
        ownerPhoneHash: 'hash-o',
        ownerContactHashes: ['hash-v'],
      }),
      true,
    );
  });

  it('excludes when owner is in viewer book', () => {
    assert.equal(
      wouldExcludeByContact({
        viewerPhoneHash: 'hash-v',
        viewerContactHashes: ['hash-o'],
        ownerPhoneHash: 'hash-o',
        ownerContactHashes: [],
      }),
      true,
    );
  });

  it('allows when neither book matches', () => {
    assert.equal(
      wouldExcludeByContact({
        viewerPhoneHash: 'hash-v',
        viewerContactHashes: ['other'],
        ownerPhoneHash: 'hash-o',
        ownerContactHashes: ['other2'],
      }),
      false,
    );
  });
});

describe('visibility modes', () => {
  it('discoverable is always visible', () => {
    assert.equal(
      isVisibleUnderMode({
        mode: 'discoverable',
        ownerLikedViewer: false,
        ownerMessagedViewer: false,
      }),
      true,
    );
  });

  it('mutual_only requires owner liked viewer', () => {
    assert.equal(
      isVisibleUnderMode({
        mode: 'mutual_only',
        ownerLikedViewer: false,
        ownerMessagedViewer: true,
      }),
      false,
    );
    assert.equal(
      isVisibleUnderMode({
        mode: 'mutual_only',
        ownerLikedViewer: true,
        ownerMessagedViewer: false,
      }),
      true,
    );
  });

  it('incognito requires like or message from owner', () => {
    assert.equal(
      isVisibleUnderMode({
        mode: 'incognito',
        ownerLikedViewer: false,
        ownerMessagedViewer: false,
      }),
      false,
    );
    assert.equal(
      isVisibleUnderMode({
        mode: 'incognito',
        ownerLikedViewer: false,
        ownerMessagedViewer: true,
      }),
      true,
    );
  });
});
