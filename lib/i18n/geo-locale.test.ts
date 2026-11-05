import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  acceptLanguagePrefersKa,
  countryFromHeaders,
  detectLocale,
  isGeorgiaCountry,
} from './geo-locale';

describe('geo-locale', () => {
  it('treats GE as Georgia', () => {
    assert.equal(isGeorgiaCountry('GE'), true);
    assert.equal(isGeorgiaCountry('ge'), true);
    assert.equal(isGeorgiaCountry('US'), false);
  });

  it('reads CDN country headers', () => {
    const h = new Headers({ 'cf-ipcountry': 'GE' });
    assert.equal(countryFromHeaders(h), 'GE');
    assert.equal(countryFromHeaders(new Headers({ 'cf-ipcountry': 'XX' })), null);
  });

  it('cookie wins over country', () => {
    assert.equal(detectLocale({ cookie: 'en', country: 'GE' }), 'en');
    assert.equal(detectLocale({ cookie: 'ka', country: 'US' }), 'ka');
  });

  it('Georgia → ka, elsewhere → en', () => {
    assert.equal(detectLocale({ country: 'GE' }), 'ka');
    assert.equal(detectLocale({ country: 'DE' }), 'en');
    assert.equal(detectLocale({ country: 'US' }), 'en');
  });

  it('unknown country falls back to Accept-Language', () => {
    assert.equal(detectLocale({ acceptLanguage: 'ka-GE,ka;q=0.9' }), 'ka');
    assert.equal(detectLocale({ acceptLanguage: 'en-US,en;q=0.9' }), 'en');
    assert.equal(detectLocale({}), 'en');
  });

  it('accept-language prefers ka only when first concrete tag is ka', () => {
    assert.equal(acceptLanguagePrefersKa('ka,en;q=0.8'), true);
    assert.equal(acceptLanguagePrefersKa('en,ka;q=0.8'), false);
  });
});
