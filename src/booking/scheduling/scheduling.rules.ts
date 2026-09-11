export interface WorkingPeriod {
  enabled: boolean;
  startTime: string;
  endTime: string;
  breaks: Array<{ startTime: string; endTime: string }>;
}

export function toMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function scheduleRuleViolation(
  startsMinute: number,
  duration: number,
  workDay: WorkingPeriod | undefined,
): string | null {
  const endsMinute = startsMinute + duration;
  if (
    !workDay?.enabled ||
    startsMinute < toMinutes(workDay.startTime) ||
    endsMinute > toMinutes(workDay.endTime)
  )
    return "Appointment is outside the staff member's working hours";
  if (
    workDay.breaks.some(
      (item) =>
        startsMinute < toMinutes(item.endTime) &&
        endsMinute > toMinutes(item.startTime),
    )
  )
    return 'Appointment overlaps a staff break';
  return null;
}

export function intervalsOverlap(
  requestedStart: number,
  requestedDuration: number,
  existingStart: number,
  existingDuration: number,
): boolean {
  return (
    requestedStart < existingStart + existingDuration * 60_000 &&
    requestedStart + requestedDuration * 60_000 > existingStart
  );
}
