export type PollutantCode = "PM10" | "PM25" | "NO2" | "O3";

export type AggregationBase = "hourly" | "daily" | "annual";

export type ThresholdRuleType = "limit" | "information";

export type ToolResultStatus = 
  | "OK" 
  | "NO_DATA" 
  | "INVALID_REQUEST" 
  | "NOT_ASSESSABLE";

export type ComplianceStatus = 
  | "COMPLIANT" 
  | "EXCEEDED" 
  | "NOT_ASSESSABLE";

export type TrendClassification = "IMPROVING" | "WORSENING" | "STABLE";

export interface ThresholdConfig {
  value: number;
  unit: string;
  base: AggregationBase;
  ruleType: ThresholdRuleType;
  description: string;
  complianceAssessable: boolean;
}

export type FloatingTimestamp = string;