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