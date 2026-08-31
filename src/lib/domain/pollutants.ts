import type { PollutantCode } from "./air-quality.types";

export const POLLUTANTS = {
  PM10: "PM10 (SM2005)",
  PM25: "Particelle sospese PM2.5",
  NO2: "Biossido di Azoto",
  O3: "Ozono",
} as const satisfies Record<PollutantCode, string>;

export function getArpaPollutantName(code: PollutantCode): string {
  return POLLUTANTS[code];
}

export function isValidPollutantCode(code: string): code is PollutantCode {
  return Object.prototype.hasOwnProperty.call(POLLUTANTS, code);
}