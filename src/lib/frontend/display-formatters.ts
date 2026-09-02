import type { FloatingTimestamp } from "../domain/air-quality.types";

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export function formatFloatingDate(floating: FloatingTimestamp): string {
  const match = floating.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return floating;
  
  const year = match[1];
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatMeasurementValue(
  value: number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toFixed(2);
}

export function formatPercentage(
  value: number | null,
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

export function formatChartXAxis(
  floating: string,
): string {
  const match = floating.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/,
  );

  if (!match) {
    return floating;
  }

  const day = match[3];
  const month = match[2];
  const hour = match[4];
  const minute = match[5];

  let formatted = `${day}/${month}`;

  if (
    hour &&
    minute &&
    (hour !== "00" || minute !== "00")
  ) {
    formatted += ` ${hour}:${minute}`;
  }

  return formatted;
}

export function formatChartTooltipLabel(
  floating: string,
): string {
  const match = floating.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
  );

  if (!match) {
    return floating;
  }

  const year = match[1];
  const month = Number.parseInt(
    match[2],
    10,
  );
  const day = Number.parseInt(
    match[3],
    10,
  );
  const hour = match[4];
  const minute = match[5];

  let formatted =
    `${day} ${MONTH_NAMES[month - 1]} ${year}`;

  if (
    hour !== "00" ||
    minute !== "00"
  ) {
    formatted += ` - ${hour}:${minute}`;
  }

  return formatted;
}