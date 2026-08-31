import type { PollutantCode, ThresholdConfig } from "./air-quality.types";

export const THRESHOLDS = {
  PM10: {
    value: 50,
    unit: "µg/m³",
    base: "daily",
    ruleType: "limit",
    description: "Limite media giornaliera",
    complianceAssessable: true, 
  },
  PM25: {
    value: 25,
    unit: "µg/m³",
    base: "annual",
    ruleType: "limit",
    description: "Limite media annuale (non calcolabile sul dataset semestrale)",
    complianceAssessable: false, 
  },
  NO2: {
    value: 200,
    unit: "µg/m³",
    base: "hourly",
    ruleType: "limit",
    description: "Limite misurazione oraria",
    complianceAssessable: true,
  },
  O3: {
    value: 180,
    unit: "µg/m³",
    base: "hourly",
    ruleType: "information",
    description: "Soglia di informazione oraria",
    complianceAssessable: true,
  },
} as const satisfies Record<PollutantCode, ThresholdConfig>;

export function getThreshold(code: PollutantCode): ThresholdConfig {
  return THRESHOLDS[code];
}