import test from 'node:test';
import assert from 'node:assert/strict';
import { dateTimeToUtc, utcDateTimeParts, utcDayBounds } from '../src/common/utils/datetime.ts';

test('uses the database UTC clock for API date and time values', () => {
  const stored = dateTimeToUtc('2026-09-15', '10:30');
  assert.equal(stored.toISOString(), '2026-09-15T10:30:00.000Z');
  assert.deepEqual(utcDateTimeParts(stored), { date: '2026-09-15', time: '10:30' });
});

test('creates UTC database-day boundaries', () => {
  const bounds = utcDayBounds('2026-03-08');
  assert.equal(bounds.start.toISOString(), '2026-03-08T00:00:00.000Z');
  assert.equal(bounds.end.toISOString(), '2026-03-08T23:59:59.999Z');
});
