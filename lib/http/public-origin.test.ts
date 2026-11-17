import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { publicRedirect, publicRequestOrigin } from './public-origin';

describe('publicRequestOrigin', () => {
  it('prefers x-forwarded-host over the container bind address', () => {
    const req = new Request('http://0.0.0.0:3000/api/v1/auth/intimgram/callback/', {
      headers: {
        host: '0.0.0.0:3000',
        'x-forwarded-host': 'flirty.ge',
        'x-forwarded-proto': 'https',
      },
    });
    assert.equal(publicRequestOrigin(req), 'https://flirty.ge');
    assert.equal(
      publicRedirect(req, '/ka/gatsnoba/').toString(),
      'https://flirty.ge/ka/gatsnoba/',
    );
  });

  it('falls back to NEXT_PUBLIC_SITE_URL when host is internal', () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://flirty.ge';
    try {
      const req = new Request('http://0.0.0.0:3000/callback', {
        headers: { host: '0.0.0.0:3000' },
      });
      assert.equal(publicRequestOrigin(req), 'https://flirty.ge');
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = prev;
    }
  });
});
