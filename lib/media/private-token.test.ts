import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePhotoUrlForViewer,
  signPrivatePhotoToken,
  verifyPrivatePhotoToken,
} from './private-token';

describe('private album URLs', () => {
  const publicR2 = 'https://media.example.ge/dating-profiles/u1/secret.webp';

  it('does not return the public R2 URL without a grant', () => {
    const url = resolvePhotoUrlForViewer({
      visibility: 'private',
      publicUrl: publicR2,
      photoId: 'photo1',
      ownerUserId: 'owner',
      viewerId: 'stranger',
      hasGrant: false,
    });
    assert.equal(url, null);
  });

  it('returns a signed app path (not R2) when granted', () => {
    const url = resolvePhotoUrlForViewer({
      visibility: 'private',
      publicUrl: publicR2,
      photoId: 'photo1',
      ownerUserId: 'owner',
      viewerId: 'friend',
      hasGrant: true,
    });
    assert.ok(url);
    assert.equal(url!.startsWith('/api/v1/media/private/?t='), true);
    assert.equal(url!.includes('media.example.ge'), false);
    assert.equal(url!.includes('secret.webp'), false);
  });

  it('rejects forged / expired tokens', () => {
    const token = signPrivatePhotoToken(
      { photoId: 'p', viewerId: 'v', ttlSec: 1 },
      1_000_000,
    );
    assert.ok(verifyPrivatePhotoToken(token, 1_000_000));
    assert.equal(verifyPrivatePhotoToken(token, 1_000_010), null);
    assert.equal(verifyPrivatePhotoToken(token + 'x', 1_000_000), null);
  });
});
