import assert from 'node:assert/strict';
import test from 'node:test';
import {
  intervalsOverlap,
  scheduleRuleViolation,
} from '../src/booking/scheduling/scheduling.rules.ts';

const workDay = {
  enabled: true,
  startTime: '09:00',
  endTime: '17:00',
  breaks: [{ startTime: '12:00', endTime: '13:00' }],
};

test('accepts an appointment inside working hours', () => {
  assert.equal(scheduleRuleViolation(9 * 60, 60, workDay), null);
});

test('rejects appointments outside working hours', () => {
  assert.match(scheduleRuleViolation(8 * 60 + 30, 60, workDay), /outside/);
  assert.match(scheduleRuleViolation(16 * 60 + 30, 60, workDay), /outside/);
});

test('rejects appointments overlapping a break', () => {
  assert.match(scheduleRuleViolation(11 * 60 + 30, 60, workDay), /break/);
});

test('detects overlap and accepts adjacent appointments', () => {
  const hour = 60 * 60 * 1000;
  assert.equal(intervalsOverlap(0, 60, hour / 2, 60), true);
  assert.equal(intervalsOverlap(0, 60, hour, 60), false);
});
