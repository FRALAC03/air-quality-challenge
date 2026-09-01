import type { FloatingTimestamp } from "./air-quality.types";

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getDaysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}

export function subtractFloatingDays(floating: FloatingTimestamp, daysToSubtract: number): FloatingTimestamp {
    if (
  !Number.isInteger(daysToSubtract) ||
  daysToSubtract < 0
) {
  throw new Error(
    "daysToSubtract must be a non-negative integer",
  );
}
  const match = floating.match(/^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/);
  if (!match) throw new Error(`Invalid floating timestamp: ${floating}`);
  
  let year = parseInt(match[1], 10);
  let month = parseInt(match[2], 10);
  let day = parseInt(match[3], 10);
  if (month < 1 || month > 12) {
  throw new Error(
    `Invalid floating timestamp: ${floating}`,
  );
}

const maxDay = getDaysInMonth(year, month);

if (day < 1 || day > maxDay) {
  throw new Error(
    `Invalid floating timestamp: ${floating}`,
  );
}
  const timePart = match[4] || "T00:00:00";

  for (let i = 0; i < daysToSubtract; i++) {
    day--;
    if (day === 0) {
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
      day = getDaysInMonth(year, month);
    }
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}${timePart}`;
}

export function getStartOfFloatingDay(floating: FloatingTimestamp): FloatingTimestamp {
  const match = floating.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) throw new Error(`Invalid floating timestamp: ${floating}`);
  return `${match[0]}T00:00:00`;
}

export function getDashboardPeriods(maxDateFloating: FloatingTimestamp) {
  const currentEnd = getStartOfFloatingDay(maxDateFloating); 
  const currentStart = subtractFloatingDays(currentEnd, 7);
  const previousStart = subtractFloatingDays(currentStart, 7);

  return {
    currentPeriod: { start: currentStart, end: currentEnd },
    previousPeriod: { start: previousStart, end: currentStart }
  };
}