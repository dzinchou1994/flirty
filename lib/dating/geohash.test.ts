import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeGeohash,
  distanceBucketBetweenCells,
  nextGeohashCell,
  distanceBucketFromKm,
} from './geohash';

describe('distance buckets', () => {
  it('never returns a numeric distance', () => {
    const bucket = distanceBucketFromKm(2.4);
    assert.equal(bucket, '1-3km');
    assert.equal(typeof bucket, 'string');
    assert.equal(bucket.includes('.'), false);
  });

  it('same cell is stable and coarse', () => {
    const cell = encodeGeohash(41.7151, 44.8271);
    assert.equal(distanceBucketBetweenCells(cell, cell), '<1km');
  });

  it('two queries for the same pair from different positions return the same bucket when cell is unchanged', () => {
    // Two GPS samples inside the same ~1km cell
    const a = { lat: 41.7151, lng: 44.8271 };
    const b = { lat: 41.7154, lng: 44.8274 }; // ~40m away
    const cellA = encodeGeohash(a.lat, a.lng);
    const cellB = encodeGeohash(b.lat, b.lng);
    assert.equal(cellA, cellB);

    const peer = encodeGeohash(41.72, 44.83);
    const bucket1 = distanceBucketBetweenCells(cellA, peer);
    const bucket2 = distanceBucketBetweenCells(cellB, peer);
    assert.equal(bucket1, bucket2);

    // nextGeohashCell keeps the stored cell while still inside it
    const stored = nextGeohashCell(cellA, b.lat, b.lng);
    assert.equal(stored, cellA);
    assert.equal(distanceBucketBetweenCells(stored, peer), bucket1);
  });
});
